import mongoose from "mongoose";
import Product from "./productModel.js";

const familiaSchema = new mongoose.Schema({

    categoria: {type: String, default: "COMBOS"},

    productos: [{
        producto: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        cantidad: { type: Number, default: 0 }
        }]
});

familiaSchema.pre("validate", function(next) {
    this.stockeable = false;
    this.stock = 0;
    next();
});

const FamiliaProductos = Product.discriminator("FamiliaProductos", familiaSchema, "COMBO")

export default FamiliaProductos;