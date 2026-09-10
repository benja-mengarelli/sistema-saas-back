import mongoose from "mongoose";

const compraSchema = new mongoose.Schema({
    empresaId: {
        type: String,
        required: true,
        index: true
    },
    proveedor: {
        nombre: { type: String, default: "Proveedor" },
        cuit: String,
        contacto: String
    },
    productos: [{
        producto: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        cantidad: { type: Number, required: true },
        costoUnitario: { type: Number, required: true },
        subtotal: { type: Number, required: true }
    }],
    total: { type: Number, required: true },
    cajaId: { type: mongoose.Schema.Types.ObjectId, ref: "Caja", default: null },
    pagos: [{
        tipoPago: { type: String, enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA"] },
        monto: Number
    }],
    estado: { type: String, enum: ["REGISTRADA", "ANULADA"], default: "REGISTRADA" }
}, { timestamps: true });

export default mongoose.model("Compra", compraSchema);