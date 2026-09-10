import CuentaCorriente from "../models/cuentaCorriente.model.js";
import Venta from "../models/venta.model.js";
import { incFromPagos, incFromLineas, aplicarIncrementos } from "../helper/facturacionCaja.service.js";


export const getCC = async (empresaId) => {
    try {
        return await CuentaCorriente.find({ empresaId }).sort({ createdAt: -1 });
    } catch (error) {
        console.error("Error al obtener cuentas corrientes:", error);
        throw new Error("Error al obtener cuentas corrientes");
    }
};

export const getCCById = async (empresaId, ccId) => {
    try {
        return await CuentaCorriente.findOne({ _id: ccId, empresaId });
    } catch (error) {
        console.error("Error al obtener cuenta corriente:", error);
        throw new Error("Error al obtener cuenta corriente");
    }
};

export const deleteCC = async (empresaId, ccId) => {
    try {
        return await CuentaCorriente.findOneAndDelete({ _id: ccId, empresaId });
    } catch (error) {
        console.error("Error al eliminar cuenta corriente:", error);
        throw new Error("Error al eliminar cuenta corriente");
    }
};


export async function crearCuentaCorriente({ empresaId, cliente, venta }, session) {
    const [cc] = await CuentaCorriente.create([{
        empresaId,
        cliente,
        cargos: [{ ventaId: venta._id, monto: venta.total }],
        totalCargos: venta.total,
        saldo: venta.total
    }], { session });
    return cc;
}

export async function agregarCargo(cuentaCorrienteId, empresaId, venta, session) {
    const cc = await CuentaCorriente.findOne({ _id: cuentaCorrienteId, empresaId }).session(session);
    if (!cc) throw new Error("Cuenta corriente no encontrada");
    if (["SALDADA", "ANULADA"].includes(cc.estado)) throw new Error(`No se puede agregar consumo a una cuenta ${cc.estado}`);

    cc.cargos.push({ ventaId: venta._id, monto: venta.total });
    cc.totalCargos += venta.total;
    cc.saldo += venta.total;
    await cc.save({ session });
    return cc;
}

// Distribuye el pago FIFO sobre los cargos pendientes, cierra ventas cubiertas
// al 100%, y devuelve las líneas a facturar (ya prorrateadas) para que POS
// las aplique a caja junto con los pagos.
export async function aplicarCobroFIFO(cc, montoPago, session) {
    let restante = montoPago;
    const lineasParaFacturar = [];

    for (const cargo of cc.cargos) {
        if (restante <= 0) break;
        const pendiente = cargo.monto - cargo.pagado;
        if (pendiente <= 0) continue;

        const aporte = Math.min(restante, pendiente);
        cargo.pagado += aporte;
        restante -= aporte;

        const venta = await Venta.findById(cargo.ventaId).session(session);
        const proporcion = aporte / cargo.monto;
        for (const linea of venta.productos) {
            lineasParaFacturar.push({ tipo: linea.tipo, subtotal: linea.subtotal * proporcion });
        }

        if (cargo.pagado === cargo.monto) {
            venta.estado = "COMPLETADO";
            venta.pagoCompleto = true;
            await venta.save({ session });
        }
    }

    return lineasParaFacturar;
}

export async function registrarCobro({ cc, cajaId, pagos, lineasParaFacturar }, session) {
    const montoPago = pagos.reduce((acc, p) => acc + p.monto, 0);

    await aplicarIncrementos(cajaId, { ...incFromPagos(pagos), ...incFromLineas(lineasParaFacturar) }, session);

    cc.pagos.push({ cajaId, pagos, monto: montoPago, fecha: new Date() });
    cc.totalPagado += montoPago;
    cc.saldo -= montoPago;
    cc.estado = cc.saldo === 0 ? "SALDADA" : "PARCIAL";
    if (cc.estado === "SALDADA") cc.fechaCierre = new Date();
    await cc.save({ session });
    return cc;
}

export async function quitarCargo(cc, ventaId) {
    const cargo = cc.cargos.find(c => c.ventaId.equals(ventaId));
    if (!cargo) throw new Error("El cargo no pertenece a esta cuenta corriente");
    if (cargo.pagado > 0) throw new Error("No se puede anular un cargo con pagos registrados (requiere flujo de devolución)");

    cc.cargos = cc.cargos.filter(c => !c.ventaId.equals(ventaId));
    cc.totalCargos -= cargo.monto;
    cc.saldo -= cargo.monto;

    if (cc.cargos.length === 0) cc.estado = "ANULADA";
    else if (cc.saldo === 0) cc.estado = "SALDADA";
    else if (cc.totalPagado > 0) cc.estado = "PARCIAL";

    return cargo;
}

