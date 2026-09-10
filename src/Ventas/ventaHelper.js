import Product from "../Productos/productModel.js";

export const calcularTotal = (productos) => {
    return productos.reduce((total, producto) => {
        return total + (producto.precio * producto.cantidad);
    }, 0);
}

export const calcularTotalPagos = (pagos) => {
    return pagos.reduce((total, pago) => {
        return total + pago.monto;
    }, 0);
}
