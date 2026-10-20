import mongoose from "mongoose"

const ventaSchema = new mongoose.Schema({
    empresaId: { type: String, required: true, index: true },

    cajaId: { type: mongoose.Schema.Types.ObjectId, ref: "Caja", required: true },

    cliente: { type: String, default: "Consumidor" },

    productos: [{
        producto: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        tipo: { type: String, enum: ["PRODUCTO", "SERVICIO", "ALQUILER", "COMBO"] },
        nombre: String,
        cantidad: Number,
        subtotal: Number
    }],

    subtotal: Number,
    vuelto: { type: Number, default: 0 },
    claveIdempotencia: String,

    total: { type: Number, required: true },

    pagos: [{
        tipoPago: { type: String, enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA"] },
        monto: Number
    }],

    pagoCompleto: { type: Boolean, default: true },

    descuento: { type: Number, default: 0 },

    recargo: { type: Number, default: 0 },

    estado: { type: String, enum: ["COMPLETADO", "PENDIENTE", "ANULADO"], default: "COMPLETADO" }
}, {
    timestamps: true
});

export default mongoose.model("Venta", ventaSchema.index(
    { empresaId: 1, claveIdempotencia: 1 },
    { unique: true, partialFilterExpression: { claveIdempotencia: { $type: "string" } } }
))