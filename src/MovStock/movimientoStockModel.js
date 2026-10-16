import mongoose from "mongoose";

const movimientoStockSchema = new mongoose.Schema({
    empresaId: {
        type: String,
        required: true,
        index: true
    },
    productos: [{
        producto: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        cantidad: { type: Number, required: true },   // delta con signo: + entra, - sale
        stockAnterior: { type: Number, required: true },
        stockActual: { type: Number, required: true },
    }],
    tipo: { type: String, enum: ["VENTA", "COMPRA", "AJUSTE", "MERMA", "DEVOLUCION"], required: true },
    origen: {
        tipo: { type: String, enum: ["VENTA", "COMPRA", "AJUSTE", "TRASLADO", "CAJA"] },
        referenciaId: { type: mongoose.Schema.Types.ObjectId },
    },
}, {
    timestamps: true
});

export default mongoose.model("MovimientoStock", movimientoStockSchema)