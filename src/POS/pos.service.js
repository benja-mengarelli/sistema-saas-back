import mongoose from "mongoose";
import CuentaCorriente from "../CtaCorriente/CuentaCorrienteModel.js";
import Venta from "../Ventas/ventaModel.js";
import { construirLineasVenta, validarPagos, crearDocumentoVenta, marcarVentaAnulada } from "../Ventas/venta.service.js";
import { descontarStockVenta, reponerStockVenta } from "../Productos/product.service.js";
import { aplicarFacturacion, revertirFacturacion } from "../helper/facturacionCaja.service.js";
import { obtenerCajaAbierta } from "../Caja/caja.service.js";
import { construirLineasCompra, validarProductosCompra, crearDocumentoCompra, actualizarPrecioCompra } from "../Compras/compra.service.js";
import { registrarCompra, cerrarVentasDelDia} from "../MovStock/movimientoStock.service.js";

async function conTransaccion(fn) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const resultado = await fn(session);
        await session.commitTransaction();
        return resultado;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

// --- Venta directa (mostrador) ---
export async function posVentaDirecta({ empresaId, cajaId, cliente, items, descuento = 0, recargo = 0, pagos }) {
    return conTransaccion(async (session) => {
        await obtenerCajaAbierta(cajaId, empresaId, session);

        const { lineas, subtotalGeneral } = await construirLineasVenta(items, session);
        const total = subtotalGeneral - descuento + recargo;
        validarPagos(pagos, total);

        await descontarStockVenta(items, session);

        const venta = await crearDocumentoVenta({
            empresaId, cajaId, cliente, productos: lineas, total, pagos,
            pagoCompleto: true, descuento, recargo, estado: "COMPLETADO"
        }, session);

        await aplicarFacturacion({ cajaId, pagos, lineas }, session);

        return venta;
    });
}

// --- Anular venta ---
export async function posAnularVenta({ ventaId, empresaId }) {
    return conTransaccion(async (session) => {
        const venta = await Venta.findOne({ _id: ventaId, empresaId }).session(session);
        if (!venta) throw new Error("Venta no encontrada");

        // opción 2: una venta PENDIENTE pertenece a una CC, se anula solo desde ahí
        if (venta.estado === "PENDIENTE") {
            throw new Error("Esta venta pertenece a una cuenta corriente; anulala desde la cuenta corriente");
        }

        const items = venta.productos.map(p => ({ producto: p.referencia, cantidad: p.cantidad }));
        await reponerStockVenta(items, session);

        if (venta.estado === "COMPLETADO" && venta.cajaId) {
            await revertirFacturacion({ cajaId: venta.cajaId, pagos: venta.pagos, lineas: venta.productos }, session);
        }

        await marcarVentaAnulada(ventaId, empresaId, session);
        return venta;
    });
}

// --- Abrir cuenta corriente ---
export async function posAbrirCuentaCorriente({ empresaId, cajaId, cliente, items }) {
    return conTransaccion(async (session) => {
        await obtenerCajaAbierta(cajaId, empresaId, session);

        const { lineas, subtotalGeneral } = await construirLineasVenta(items, session);
        await descontarStockVenta(items, session);

        const venta = await crearDocumentoVenta({
            empresaId, cajaId, cliente, productos: lineas, total: subtotalGeneral,
            pagos: [], pagoCompleto: false, estado: "PENDIENTE"
        }, session);

        return ccService.crearCuentaCorriente({ empresaId, cliente, venta }, session);
    });
}

export async function posAgregarConsumoCC({ cuentaCorrienteId, empresaId, cajaId, cliente, items }) {
    return conTransaccion(async (session) => {
        await obtenerCajaAbierta(cajaId, empresaId, session);

        const { lineas, subtotalGeneral } = await construirLineasVenta(items, session);
        await descontarStockVenta(items, session);

        const venta = await crearDocumentoVenta({
            empresaId, cajaId, cliente, productos: lineas, total: subtotalGeneral,
            pagos: [], pagoCompleto: false, estado: "PENDIENTE"
        }, session);

        return ccService.agregarCargo(cuentaCorrienteId, empresaId, venta, session);
    });
}

// --- Cobrar CC (total o parcial) ---
export async function posCobrarCuentaCorriente({ cuentaCorrienteId, empresaId, cajaId, pagos }) {
    return conTransaccion(async (session) => {
        await obtenerCajaAbierta(cajaId, empresaId, session);

        const cc = await CuentaCorriente.findOne({ _id: cuentaCorrienteId, empresaId }).session(session);
        if (!cc) throw new Error("Cuenta corriente no encontrada");
        if (["SALDADA", "ANULADA"].includes(cc.estado)) throw new Error(`La cuenta está ${cc.estado}`);

        const montoPago = pagos.reduce((acc, p) => acc + p.monto, 0);
        if (montoPago <= 0) throw new Error("El monto a cobrar debe ser mayor a 0");
        if (montoPago > cc.saldo) throw new Error(`El monto (${montoPago}) supera el saldo pendiente (${cc.saldo})`);

        const lineasParaFacturar = await ccService.aplicarCobroFIFO(cc, montoPago, session);
        return ccService.registrarCobro({ cc, cajaId, pagos, lineasParaFacturar }, session);
    });
}

// --- Anular un cargo de CC sin pagos ---
export async function posAnularCargoCC({ cuentaCorrienteId, empresaId, ventaId }) {
    return conTransaccion(async (session) => {
        const cc = await CuentaCorriente.findOne({ _id: cuentaCorrienteId, empresaId }).session(session);
        if (!cc) throw new Error("Cuenta corriente no encontrada");

        const cargo = await ccService.quitarCargo(cc, ventaId);

        const venta = await Venta.findOne({ _id: ventaId, empresaId }).session(session);
        const items = venta.productos.map(p => ({ producto: p.referencia, cantidad: p.cantidad }));
        await reponerStockVenta(items, session);
        await marcarVentaAnulada(ventaId, empresaId, session);

        await cc.save({ session });
        return { cc, cargoAnulado: cargo };
    });
}

/*! CAJA*/
export async function posAbrirCaja({ empresaId, abiertaPor, efectivoInicial }) {
    return conTransaccion(async (session) => {
        try {
            return await cajaService.crearCajaDoc(
                { empresaId, fecha: new Date(), abiertaPor, efectivoInicial },
                session
            );
        } catch (err) {
            if (err.code === 11000) throw new Error("Ya existe una caja abierta para esta empresa");
            throw err;
        }
    });
}

export async function posRegistrarIngreso({ empresaId, cajaId, tipo, monto, motivo }) {
    return conTransaccion(async (session) => {
        await cajaService.obtenerCajaAbierta(cajaId, empresaId, session);
        await cajaService.registrarIngreso(cajaId, { tipo, monto, motivo }, session);
    });
}

export async function posRegistrarEgreso({ empresaId, cajaId, tipo, monto, motivo }) {
    return conTransaccion(async (session) => {
        await cajaService.obtenerCajaAbierta(cajaId, empresaId, session);
        await cajaService.registrarEgreso(cajaId, { tipo, monto, motivo }, session);
    });
}

export async function posRegistrarRetiro({ empresaId, cajaId, monto }) {
    return conTransaccion(async (session) => {
        await cajaService.obtenerCajaAbierta(cajaId, empresaId, session);
        await cajaService.registrarRetiro(cajaId, monto, session);
    });
}

export async function posCerrarCaja({ empresaId, cajaId, efectivoFinal, cerradaPor }) {
    return conTransaccion(async (session) => {
        const caja = await cajaService.obtenerCajaAbierta(cajaId, empresaId, session);

        // arma el MovimientoStock agregado del día ANTES de cerrar
        // (agrupa por venta.cajaId: incluye COMPLETADO y PENDIENTE, excluye ANULADO)
        await cerrarVentasDelDia({ empresaId, cajaId }, session);

        return cajaService.cerrarCajaDoc({ caja, efectivoFinal, cerradaPor }, session);
    });
}

/*! COMPRAS */
export async function posRegistrarCompra({ empresaId, cajaId, proveedor, items, pagos = [] }) {
    return conTransaccion(async (session) => {
        await validarProductosCompra(items, session);

        const { lineas, total } = construirLineasCompra(items);

        if (pagos.length) {
            const sumaPagos = pagos.reduce((acc, p) => acc + p.monto, 0);
            if (sumaPagos !== total) {
                throw new Error(`Los pagos (${sumaPagos}) no coinciden con el total (${total})`);
            }
            if (cajaId) await cajaService.obtenerCajaAbierta(cajaId, empresaId, session);
        }

        // 1. documento de compra
        const compra = await crearDocumentoCompra({
            empresaId, proveedor, productos: lineas, total,
            cajaId: cajaId || null, pagos
        }, session);

        // 2. stock + auditoría, colgado de la compra recién creada
        await registrarCompra({
            empresaId,
            items: items.map(i => ({ producto: i.producto, cantidad: i.cantidad })),
            origen: { tipo: "COMPRA", referenciaId: compra._id }
        }, session);

        // 3. actualización opcional de precioCompra
        await actualizarPrecioCompra(items, session);

        // 4. si se pagó con plata de la caja del día, queda como egreso
        if (cajaId && pagos.length) {
            for (const pago of pagos) {
                await cajaService.registrarEgreso(cajaId, {
                    tipo: pago.tipoPago,
                    monto: pago.monto,
                    motivo: `Compra a proveedor${proveedor?.nombre ? " - " + proveedor.nombre : ""}`
                }, session);
            }
        }

        return compra;
    });
}