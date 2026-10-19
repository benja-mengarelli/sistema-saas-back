import Caja from "./cajaModel.js";
import { errorHttp } from '../utils/errores.js';

const redondear2 = (n) => Math.round(n * 100) / 100;

export const obtenerCajaAbierta = (empresaId, session = null) =>
    Caja.findOne({ empresaId, estado: 'abierta' }).session(session);

export function calcularResumen(caja) {
    const c = typeof caja.toObject === 'function' ? caja.toObject() : caja;
    const suma = (lista, tipo) =>
        (lista || []).filter((x) => x.tipo === tipo).reduce((s, x) => s + (x.monto || 0), 0);

    const pagos = {
        efectivo: c.pagos?.efectivo || 0,
        transferencia: c.pagos?.transferencia || 0,
        tarjeta: c.pagos?.tarjeta || 0,
    };
    const facturacion = {
        productos: c.facturacion?.productos || 0,
        servicios: c.facturacion?.servicios || 0,
        alquileres: c.facturacion?.alquileres || 0,
    };
    const efectivo = {
        inicial: c.efectivo?.inicial || 0,
        cobrado: pagos.efectivo,
        ingresos: suma(c.ingresos, 'EFECTIVO'),
        egresos: suma(c.egresos, 'EFECTIVO'),
        retirado: c.efectivo?.retirado || 0,
    };
    efectivo.esperado = redondear2(
        efectivo.inicial + efectivo.cobrado + efectivo.ingresos - efectivo.egresos - efectivo.retirado
    );

    return {
        facturacion: { ...facturacion, total: redondear2(facturacion.productos + facturacion.servicios + facturacion.alquileres) },
        pagos: { ...pagos, total: redondear2(pagos.efectivo + pagos.transferencia + pagos.tarjeta) },
        efectivo,
    };
}

export async function abrirCaja({ empresaId, efectivoInicial, abiertaPor }) {
    if (typeof efectivoInicial !== 'number' || !Number.isFinite(efectivoInicial) || efectivoInicial < 0) {
        throw errorHttp(400, 'El efectivo inicial debe ser un número mayor o igual a 0');
    }
    try {
        return await Caja.create({
            empresaId,
            fecha: new Date(),
            estado: 'abierta',
            abiertaPor,
            efectivo: { inicial: efectivoInicial },
        });
    } catch (error) {
        if (error.code === 11000) throw errorHttp(409, 'Ya hay una caja abierta');
        throw error;
    }
}

export async function cerrarCaja({ caja, efectivoContado, cerradaPor }, session) {
    const { efectivo } = calcularResumen(caja);

    caja.efectivo.final = efectivoContado;
    caja.efectivo.esperado = efectivo.esperado;
    caja.efectivo.diferencia = redondear2(efectivoContado - efectivo.esperado);
    caja.estado = 'cerrada';
    caja.cerradaPor = cerradaPor;
    await caja.save({ session });
    return caja;
}






/* export const getCajas = async (empresaId) => {
    try {
        return await Caja.find({ empresaId }).sort({ fecha: -1 });
    } catch (error) {
        console.error("Error al obtener cajas:", error);
        throw new Error("Error al obtener cajas");
    }
};

export const getCajaById = async (empresaId, cajaId) => {
    try {
        return await Caja.findOne({ _id: cajaId, empresaId });
    } catch (error) {
        console.error("Error al obtener caja:", error);
        throw new Error("Error al obtener caja");
    }
};

export async function obtenerCajaAbierta(cajaId, empresaId, session) {
    const caja = await Caja.findOne({ _id: cajaId, empresaId, estado: "abierta" }).session(session);
    if (!caja) throw new Error("La caja indicada no existe o no está abierta");
    return caja;
}

export async function crearCajaDoc({ empresaId, fecha, abiertaPor, efectivoInicial = 0 }, session) {
    const [caja] = await Caja.create([{
        empresaId,
        fecha,
        abiertaPor,
        estado: "abierta",
        efectivo: { Inicial: efectivoInicial }
    }], { session });
    return caja;
}

export async function registrarIngreso(cajaId, { tipo, monto, motivo }, session) {
    await Caja.updateOne(
        { _id: cajaId, estado: "abierta" },
        { $push: { ingresos: { tipo, monto, motivo } } },
        { session }
    );
}

export async function registrarEgreso(cajaId, { tipo, monto, motivo }, session) {
    await Caja.updateOne(
        { _id: cajaId, estado: "abierta" },
        { $push: { egresos: { tipo, monto, motivo } } },
        { session }
    );
}

export async function registrarRetiro(cajaId, monto, session) {
    await Caja.updateOne(
        { _id: cajaId, estado: "abierta" },
        { $inc: { "efectivo.retirado": monto } },
        { session }
    );
}

export function calcularEsperado(caja) {
    const ingresosEfectivo = caja.ingresos
        .filter(i => i.tipo === "EFECTIVO")
        .reduce((acc, i) => acc + i.monto, 0);
    const egresosEfectivo = caja.egresos
        .filter(e => e.tipo === "EFECTIVO")
        .reduce((acc, e) => acc + e.monto, 0);

    return caja.efectivo.Inicial
        + caja.pagos.efectivo
        + ingresosEfectivo
        - egresosEfectivo
        - caja.efectivo.retirado;
}

export async function cerrarCajaDoc({ caja, efectivoFinal, cerradaPor }, session) {
    const esperado = calcularEsperado(caja);
    caja.efectivo.esperado = esperado;
    caja.efectivo.Final = efectivoFinal;
    caja.efectivo.diferencia = efectivoFinal - esperado;
    caja.estado = "cerrada";
    caja.cerradaPor = cerradaPor;
    await caja.save({ session });
    return caja;
}




 */