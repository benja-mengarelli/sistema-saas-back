import mongoose from "mongoose"

const CCSchema = new mongoose.Schema({
    empresaId: { type: String, required: true, index: true },

    cliente: { type: String, default: "C/C" },

    ventaId: { type: mongoose.Schema.Types.ObjectId, ref: "Venta" },

    productos: [
        {
            producto: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            cantidad: {
                type: Number,
                required: true
            },
            subtotal: {
                type: Number,
                required: true
            }
        }
    ],

    cargos: [{
        ventaId: { type: mongoose.Schema.Types.ObjectId, ref: "Venta", required: true },
        monto: { type: Number, required: true },
        pagado: { type: Number, default: 0 },
        fecha: { type: Date, default: Date.now }
    }],
    
    totalCargos: { type: Number, required: true },
    saldo: { type: Number, required: true },
    
    estado: { type: String, enum: ["ABIERTA", "PARCIAL", "SALDADA", "ANULADA"], default: "ABIERTA" },

    pagos: [{
        tipoPago: { type: String, enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA"] },
        monto: Number
    }]
});

export default mongoose.model("CuentaCorriente", CCSchema);