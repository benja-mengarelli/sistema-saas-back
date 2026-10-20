import mongoose from "mongoose"

const CCSchema = new mongoose.Schema({
    empresaId: { type: String, required: true, index: true },
    cliente: { type: String, default: "C/C" },

    cargos: [{
        ventaId: { type: mongoose.Schema.Types.ObjectId, ref: "Venta", required: true },
        monto: { type: Number, required: true },
        fecha: { type: Date, default: Date.now }
    }],

    pagos: [{
        clave: { type: String, required: true },
        tipoPago: { type: String, enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA"], required: true },
        monto: { type: Number, required: true },
        fecha: { type: Date, default: Date.now }
    }],

    totalCargos: { type: Number, default: 0 },
    totalPagado: { type: Number, default: 0 },
    saldo: { type: Number, default: 0 },

    estado: { type: String, enum: ["ABIERTA", "PARCIAL", "SALDADA", "ANULADA"], default: "ABIERTA" },
    ventaFinalId: { type: mongoose.Schema.Types.ObjectId, ref: "Venta" }
}, { timestamps: true });

CCSchema.index(
    { empresaId: 1, cliente: 1 },
    { unique: true, partialFilterExpression: { estado: { $in: ["ABIERTA", "PARCIAL"] } } }
);

export default mongoose.model("CuentaCorriente", CCSchema);