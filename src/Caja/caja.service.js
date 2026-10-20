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
