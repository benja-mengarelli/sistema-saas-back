import mongoose from 'mongoose';
import { errorHttp } from '../utils/errores.js';
import { conTransaccion } from '../utils/transaccion.js';
import { registrarCompra, cerrarVentasDelDia } from '../MovStock/movimientoStock.service.js';
import {
    construirLineasCompra, validarProductosCompra,
    crearDocumentoCompra, actualizarPrecioCompra,
} from '../Compras/compra.service.js';
import { obtenerCajaAbierta, cerrarCaja, calcularResumen } from '../Caja/caja.service.js';
import { descontarStockVenta } from '../Productos/product.service.js'; 
import {
    buscarVentaPorClave, construirLineasVenta, calcularCobro,
    lineasParaFacturar, crearDocumentoVenta,
} from '../Ventas/venta.service.js'; 
import { aplicarFacturacion } from '../helper/facturacionCaja.service.js';
import { crearCC, obtenerCCAbierta, obtenerCCPorId, agregarCargo, agregarPago, ventasDeCargos, unificarProductos, liquidarVentas, cerrarCC } from '../CtaCorriente/cuentaCorriente.service.js';


const TIPOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

function normalizarCompra(body = {}) {
    const { items } = body;
    if (!Array.isArray(items) || items.length === 0) throw errorHttp(400, 'La compra necesita al menos un ítem');
    if (items.length > 100) throw errorHttp(400, 'Demasiados ítems en una sola compra');

    const normalizados = items.map((i, n) => {
        const cantidad = Number(i?.cantidad);
        const costoUnitario = Number(i?.costoUnitario);
        if (!Number.isFinite(cantidad) || cantidad <= 0) throw errorHttp(400, `Ítem ${n + 1}: la cantidad debe ser mayor a 0`);
        if (!Number.isFinite(costoUnitario) || costoUnitario < 0) throw errorHttp(400, `Ítem ${n + 1}: el costo no es válido`);

        const descripcion = typeof i.descripcion === 'string' ? i.descripcion.trim().slice(0, 120) : '';
        if (i.producto) {
            if (!mongoose.isValidObjectId(i.producto)) throw errorHttp(400, `Ítem ${n + 1}: producto inválido`);
        } else if (!descripcion) {
            throw errorHttp(400, `Ítem ${n + 1}: indicá un producto o una descripción`);
        }

        return {
            producto: i.producto || null,
            descripcion,
            cantidad,
            costoUnitario,
            actualizarPrecioCompra: Boolean(i.producto && i.actualizarPrecioCompra),
        };
    });

    const nombre = typeof body.proveedor?.nombre === 'string' ? body.proveedor.nombre.trim().slice(0, 100) : '';
    return { items: normalizados, proveedor: nombre ? { nombre } : undefined };
}

export async function procesarCompra(empresaId, body) {
    const { items, proveedor } = normalizarCompra(body);

    return conTransaccion(async (session) => {
        const porId = await validarProductosCompra(empresaId, items, session);

        // Para los ítems del catálogo, guardamos el nombre de ese momento
        for (const item of items) {
            if (item.producto) item.descripcion = porId.get(item.producto.toString()).nombre;
        }

        const { lineas, total } = construirLineasCompra(items);
        const compra = await crearDocumentoCompra({ empresaId, proveedor, productos: lineas, total }, session);

        const itemsStock = items
            .filter((i) => i.producto)
            .map((i) => ({ producto: i.producto, cantidad: i.cantidad }));

        await registrarCompra(
            { empresaId, items: itemsStock, origen: { tipo: 'COMPRA', referenciaId: compra._id } },
            session
        );
        await actualizarPrecioCompra(empresaId, items, session);

        return compra;
    });
}

export async function cerrarCajaPOS(empresaId, { efectivoContado, cerradaPor }) {
    if (typeof efectivoContado !== 'number' || !Number.isFinite(efectivoContado) || efectivoContado < 0) {
        throw errorHttp(400, 'El efectivo contado debe ser un número mayor o igual a 0');
    }

    return conTransaccion(async (session) => {
        const caja = await obtenerCajaAbierta(empresaId, session);
        if (!caja) throw errorHttp(404, 'No hay una caja abierta');

        await cerrarVentasDelDia({ empresaId, cajaId: caja._id }, session); // movimiento de stock agrupado
        const cerrada = await cerrarCaja({ caja, efectivoContado, cerradaPor }, session);

        return { caja: cerrada, resumen: calcularResumen(cerrada) };
    });
}



/*! VENTAS  */
function validarClave(c) {
    if (typeof c !== 'string' || c.length < 8 || c.length > 64) throw errorHttp(400, 'Clave de operación inválida');
    return c;
}

function normalizarItems(items) {
    if (!Array.isArray(items) || items.length === 0) throw errorHttp(400, 'Hace falta al menos un producto');
    if (items.length > 100) throw errorHttp(400, 'Demasiados productos en una sola operación');
    const porProducto = new Map();
    items.forEach((i, n) => {
        if (!mongoose.isValidObjectId(i?.producto)) throw errorHttp(400, `Producto ${n + 1} inválido`);
        const cantidad = Number(i.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) throw errorHttp(400, `Producto ${n + 1}: cantidad inválida`);
        porProducto.set(String(i.producto), (porProducto.get(String(i.producto)) || 0) + cantidad);
    });
    return [...porProducto].map(([producto, cantidad]) => ({ producto, cantidad }));
}



function normalizarVenta(body = {}) {
    const { claveIdempotencia, items, pagos, montoACobrar, cliente } = body;

    if (typeof claveIdempotencia !== 'string' || claveIdempotencia.length < 8 || claveIdempotencia.length > 64) throw errorHttp(400, 'Clave de operación inválida');
    if (!Array.isArray(items) || items.length === 0) throw errorHttp(400, 'Hace falta al menos un producto');
    if (items.length > 100) throw errorHttp(400, 'Demasiados productos en una sola operación');
    const porProducto = new Map();
    items.forEach((i, n) => {
        if (!mongoose.isValidObjectId(i?.producto)) throw errorHttp(400, `Producto ${n + 1} inválido`);
        const cantidad = Number(i.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) throw errorHttp(400, `Producto ${n + 1}: cantidad inválida`);
        porProducto.set(String(i.producto), (porProducto.get(String(i.producto)) || 0) + cantidad);
    });

    if (!Array.isArray(pagos) || pagos.length === 0 || pagos.length > 10) throw errorHttp(400, 'Pagos inválidos');
    const pagosOk = pagos.map((p, n) => {
        const monto = Number(p?.monto);
        if (!TIPOS_PAGO.includes(p?.tipoPago)) throw errorHttp(400, `Pago ${n + 1}: tipo inválido`);
        if (!Number.isFinite(monto) || monto <= 0) throw errorHttp(400, `Pago ${n + 1}: monto inválido`);
        return { tipoPago: p.tipoPago, monto };
    });

    let monto;
    if (montoACobrar != null) {
        monto = Number(montoACobrar);
        if (!Number.isFinite(monto) || monto <= 0) throw errorHttp(400, 'El monto a cobrar es inválido');
    }

    const nombre = typeof cliente === 'string' ? cliente.trim().slice(0, 80) : '';

    return {
        claveIdempotencia,
        items: [...porProducto].map(([producto, cantidad]) => ({ producto, cantidad })),
        pagos: pagosOk,
        montoACobrar: monto,
        cliente: nombre || undefined,
    };
}

export async function procesarVenta(empresaId, body) {
    const datos = normalizarVenta(body);

    // Si la operación ya se hizo (reintento tras un timeout), devolvemos la misma venta
    const previa = await buscarVentaPorClave(empresaId, datos.claveIdempotencia);
    if (previa) return { venta: previa, repetida: true };

    try {
        const venta = await conTransaccion(async (session) => {
            const caja = await obtenerCajaAbierta(empresaId, session);
            if (!caja) throw errorHttp(409, 'No hay una caja abierta');

            const { lineas, subtotalGeneral } = await construirLineasVenta(empresaId, datos.items, session);
            const cobro = calcularCobro({
                subtotal: subtotalGeneral, montoACobrar: datos.montoACobrar, pagos: datos.pagos,
            });

            await descontarStockVenta(datos.items, session);

            const nueva = await crearDocumentoVenta({
                empresaId,
                cajaId: caja._id,
                cliente: datos.cliente,
                productos: lineas,
                subtotal: subtotalGeneral,
                descuento: cobro.descuento,
                recargo: cobro.recargo,
                total: cobro.total,
                pagos: cobro.pagos,
                vuelto: cobro.vuelto,
                pagoCompleto: true,
                estado: 'COMPLETADO',
                claveIdempotencia: datos.claveIdempotencia,
            }, session);

            await aplicarFacturacion({
                cajaId: caja._id,
                pagos: cobro.pagos,
                lineas: lineasParaFacturar(lineas, cobro.total),
            }, session);

            return nueva;
        });
        return { venta, repetida: false };
    } catch (error) {
        // Dos pedidos simultáneos con la misma clave: gana uno, el otro devuelve esa venta
        if (error.code === 11000) {
            const existente = await buscarVentaPorClave(empresaId, datos.claveIdempotencia);
            if (existente) return { venta: existente, repetida: true };
        }
        throw error;
    }
}


/*! CUENTA CORRIENTE  */
function normalizarCargoCC(body = {}) {
    const { claveIdempotencia, items, cuentaId, cliente } = body;
    if (cuentaId != null && !mongoose.isValidObjectId(cuentaId)) throw errorHttp(400, 'Cuenta corriente inválida');
    const nombre = typeof cliente === 'string' ? cliente.trim().slice(0, 80) : '';
    if (cuentaId == null && !nombre) throw errorHttp(400, 'Indicá una cuenta existente o el nombre de una nueva');
    return {
        claveIdempotencia: validarClave(claveIdempotencia),
        items: normalizarItems(items),
        cuentaId: cuentaId ?? undefined,   // si vienen los dos, manda cuentaId
        cliente: nombre || undefined,
    };
}

// Carrito → cuenta corriente (existente o nueva). Descuenta stock y deja una venta PENDIENTE.
export async function procesarCargoCC(empresaId, body) {
    const datos = normalizarCargoCC(body);

    const previa = await buscarVentaPorClave(empresaId, datos.claveIdempotencia);
    if (previa) {
        return { venta: previa, cuenta: await obtenerCCPorId(empresaId, previa.cuentaCorrienteId), repetida: true };
    }

    try {
        return await conTransaccion(async (session) => {
            const caja = await obtenerCajaAbierta(empresaId, session);
            if (!caja) throw errorHttp(409, 'No hay una caja abierta');

            const cc = datos.cuentaId
                ? await obtenerCCAbierta(empresaId, datos.cuentaId, session)
                : await crearCC(empresaId, datos.cliente, session);

            const { lineas, subtotalGeneral } = await construirLineasVenta(empresaId, datos.items, session);
            await descontarStockVenta(datos.items, session);

            const venta = await crearDocumentoVenta({
                empresaId,
                cajaId: caja._id,            // caja abierta cuando el producto salió
                cliente: cc.cliente,
                productos: lineas,
                subtotal: subtotalGeneral,
                total: subtotalGeneral,
                descuento: 0,
                recargo: 0,
                pagos: [],
                vuelto: 0,
                pagoCompleto: false,
                estado: 'PENDIENTE',
                cuentaCorrienteId: cc._id,
                claveIdempotencia: datos.claveIdempotencia,
            }, session);

            await agregarCargo(cc, venta._id, subtotalGeneral, session);
            return { venta, cuenta: cc, repetida: false };
        });
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern?.claveIdempotencia) {
                const existente = await buscarVentaPorClave(empresaId, datos.claveIdempotencia);
                if (existente) {
                    return { venta: existente, cuenta: await obtenerCCPorId(empresaId, existente.cuentaCorrienteId), repetida: true };
                }
            }
            if (error.keyPattern?.cliente) throw errorHttp(409, 'Ya hay una cuenta corriente abierta con ese nombre');
        }
        throw error;
    }
}

// Pago parcial: solo queda en la CC, no toca la caja
export async function registrarPagoCC(empresaId, cuentaId, body = {}) {
    if (!mongoose.isValidObjectId(cuentaId)) throw errorHttp(400, 'Cuenta corriente inválida');
    const clave = validarClave(body.claveIdempotencia);
    if (!TIPOS_PAGO.includes(body.tipoPago)) throw errorHttp(400, 'Tipo de pago inválido');
    const monto = redondear2(Number(body.monto));
    if (!Number.isFinite(monto) || monto <= 0) throw errorHttp(400, 'Monto inválido');

    return conTransaccion(async (session) => {
        const cc = await obtenerCCAbierta(empresaId, cuentaId, session);
        if (cc.pagos.some((p) => p.clave === clave)) return { cuenta: cc, repetido: true };
        if (monto > cc.saldo) throw errorHttp(400, `El pago supera el saldo pendiente (${cc.saldo})`);
        await agregarPago(cc, { clave, tipoPago: body.tipoPago, monto }, session);
        return { cuenta: cc, repetido: false };
    });
}

// Finaliza: unifica todo en una venta COMPLETADO imputada a la caja abierta
export async function finalizarCC(empresaId, cuentaId, body = {}) {
    if (!mongoose.isValidObjectId(cuentaId)) throw errorHttp(400, 'Cuenta corriente inválida');
    const claveIdempotencia = validarClave(body.claveIdempotencia);

    let montoACobrar;
    if (body.montoACobrar != null) {
        montoACobrar = Number(body.montoACobrar);
        if (!Number.isFinite(montoACobrar) || montoACobrar <= 0) throw errorHttp(400, 'El monto a cobrar es inválido');
    }

    const previa = await buscarVentaPorClave(empresaId, claveIdempotencia);
    if (previa) return { venta: previa, repetida: true };

    try {
        const venta = await conTransaccion(async (session) => {
            const caja = await obtenerCajaAbierta(empresaId, session);
            if (!caja) throw errorHttp(409, 'Para finalizar una cuenta corriente tiene que haber una caja abierta');

            const cc = await obtenerCCAbierta(empresaId, cuentaId, session);
            const componentes = await ventasDeCargos(empresaId, cc, session);
            const productos = unificarProductos(componentes);

            const cobro = calcularCobro({
                subtotal: cc.totalCargos,
                montoACobrar,
                pagos: cc.pagos.map((p) => ({ tipoPago: p.tipoPago, monto: p.monto })),
            });
            // en la CC los pagos ya se guardan como monto aplicado: no puede haber vuelto
            if (cobro.vuelto > 0) throw errorHttp(400, 'Los pagos superan el total a cobrar');

            const nueva = await crearDocumentoVenta({
                empresaId,
                cajaId: caja._id,
                cliente: cc.cliente,
                productos,
                subtotal: cc.totalCargos,
                descuento: cobro.descuento,
                recargo: cobro.recargo,
                total: cobro.total,
                pagos: cobro.pagos,
                vuelto: 0,
                pagoCompleto: true,
                estado: 'COMPLETADO',
                afectaStock: false,           // el stock ya salió con cada cargo
                cuentaCorrienteId: cc._id,
                claveIdempotencia,
            }, session);

            await aplicarFacturacion({
                cajaId: caja._id,
                pagos: cobro.pagos,
                lineas: lineasParaFacturar(productos, cobro.total),
            }, session);

            await liquidarVentas(componentes.map((v) => v._id), session);
            await cerrarCC(cc, nueva._id, session);
            return nueva;
        });
        return { venta, repetida: false };
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.claveIdempotencia) {
            const existente = await buscarVentaPorClave(empresaId, claveIdempotencia);
            if (existente) return { venta: existente, repetida: true };
        }
        throw error;
    }
}