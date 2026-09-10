import mongoose from "mongoose";

const movimientoStockSchema = new mongoose.Schema({
    empresaId: {
        type: String,
        required: true,
        index: true
    },
    productos: [
        {
            producto: { 
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            stockAnterior: {
                type: Number,
                required: true
            },
            stockActual: {
                type: Number,
                required: true
            }
        }
    ],
    origen: {
        tipo: { type: String, enum: ["VENTA", "COMPRA", "AJUSTE", "TRASLADO"] },
        referenciaId: { type: mongoose.Schema.Types.ObjectId }
    }
}, {
    timestamps: true
});

export default mongoose.model("MovimientoStock", movimientoStockSchema)