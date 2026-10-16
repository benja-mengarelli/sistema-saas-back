import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    empresaId: { type: String, required: true, index: true },

    nombre: { type: String, required: true },

    tipo: { type: String, enum: ["PRODUCTO", "SERVICIO", "ALQUILER", "COMBO"], required: true },

    precioCompra: { type: Number, default: 0 },
    precioVenta: { type: Number, required: true },

    categoria: String,

    stockeable: { type: Boolean, required: true, default: false },
    stock: { type: Number, default: 0 },
    avisarStockMinimo: { type: Boolean, default: false },
    stockMinimo: { type: Number, default: 0 },

    imagen: { type: String, default: null },
    activo: { type: Boolean, default: true },
    eliminadoEn: { type: Date, default: null },
}, {
    timestamps: true,
    discriminatorKey: 'tipo'
}

);

export default mongoose.model('Product', productSchema);