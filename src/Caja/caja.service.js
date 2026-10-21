import Caja from "./cajaModel.js";
import { errorHttp } from '../utils/errores.js';
import mongoose from "mongoose";
import Venta from "../Ventas/ventaModel.js"

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

function validarMonto(valor, nombre) {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
        throw errorHttp(400, `${nombre} debe ser un número mayor o igual a 0`);
    }
    return redondear2(valor);
}

export async function cerrarCaja({ caja, efectivoEnCaja, efectivoRetirado, cerradaPor }, session) {
    const enCaja = validarMonto(efectivoEnCaja, 'El saldo en caja');
    const retirado = validarMonto(efectivoRetirado ?? 0, 'El efectivo retirado');

    const { efectivo } = calcularResumen(caja); // esperado: lo que debería haber en total ahora
    const contado = redondear2(enCaja + retirado);

    caja.efectivo.final = enCaja;
    caja.efectivo.retirado = redondear2((caja.efectivo.retirado || 0) + retirado);
    caja.efectivo.esperado = redondear2(efectivo.esperado - retirado); // lo que debería quedar
    caja.efectivo.diferencia = redondear2(contado - efectivo.esperado);
    caja.estado = 'cerrada';
    caja.cerradaPor = cerradaPor;
    await caja.save({ session });
    return caja;
}


export async function listarCajas(empresaId, dias = 15) {
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    return Caja.find({ empresaId, fecha: { $gte: desde } })
        .select('fecha estado efectivo pagos facturacion')
        .sort({ fecha: -1 })
        .lean();
}

export async function detalleCaja(empresaId, cajaId) {
    if (!mongoose.isValidObjectId(cajaId)) throw errorHttp(400, 'Caja inválida');
    const caja = await Caja.findOne({ _id: cajaId, empresaId }).lean();
    if (!caja) throw errorHttp(404, 'La caja no existe');

    const filtro = { empresaId, cajaId: caja._id, estado: 'COMPLETADO' };

    const [lineas, [resumen]] = await Promise.all([
        Venta.aggregate([
            { $match: filtro },
            { $unwind: '$productos' },
            {
                $group: {
                    _id: { producto: '$productos.producto', tipo: '$productos.tipo', nombre: '$productos.nombre' },
                    cantidad: { $sum: '$productos.cantidad' },
                    subtotal: { $sum: '$productos.subtotal' },
                }
            },
            { $project: { _id: 0, producto: '$_id.producto', tipo: '$_id.tipo', nombre: '$_id.nombre', cantidad: 1, subtotal: 1 } },
            { $sort: { nombre: 1 } },
        ]),
        Venta.aggregate([
            { $match: filtro },
            {
                $group: {
                    _id: null,
                    ventas: { $sum: 1 },
                    total: { $sum: '$total' },
                    descuento: { $sum: '$descuento' },
                    recargo: { $sum: '$recargo' },
                }
            },
        ]),
    ]);

    return {
        caja,
        lineas,
        ventas: resumen
            ? { ventas: resumen.ventas, total: resumen.total, descuento: resumen.descuento, recargo: resumen.recargo }
            : { ventas: 0, total: 0, descuento: 0, recargo: 0 },
    };
}