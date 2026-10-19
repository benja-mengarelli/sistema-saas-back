import mongoose from "mongoose"

const cajaSchema = new mongoose.Schema({
    empresaId: {
        type: String,
        required: true,
        index: true
    },
    fecha: {
        type: Date,
        required: true
    },
    estado: {
        type: String,
        enum: ["abierta", "cerrada"],
        default: "abierta"
    },
    abiertaPor: {
        type: String,
        default: "miembro"
    },
    cerradaPor: {
        type: String,
        default: "miembro"
    },
    efectivo: {
        inicial: {
            type: Number,
            default: 0
        },
        final: {
            type: Number,
            default: 0
        },
        esperado: Number,
        retirado: {
            type: Number,
            default: 0
        },
        diferencia: {
            type: Number,
            default: 0
        }
    },
    pagos: {
        efectivo: {
            type: Number,
            default: 0
        },
        transferencia: {
            type: Number,
            default: 0
        },
        tarjeta: {
            type: Number,
            default: 0
        }
    },
    facturacion: {
        productos: {
            type: Number,
            default: 0
        },
        servicios: {
            type: Number,
            default: 0
        },
        alquileres: {
            type: Number,
            default: 0
        }
    },
    ingresos: [
        {
            tipo: {
                type: String,
                enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA"]
            },
            monto: {
                type: Number,
                default: 0
            },
            motivo: {
                type: String,
                default: "Ingreso"
            }
        }
    ],
    egresos: [
        {
            tipo: {
                type: String,
                enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA"]
            },
            monto: {
                type: Number,
                default: 0
            },
            motivo: {
                type: String,
                default: "Egreso"
            }
        }
    ]

}, {
    timestamps: true
});

cajaSchema.index(
    { empresaId: 1, estado: 1 },
    { unique: true, partialFilterExpression: { estado: "abierta" } }
);

export default mongoose.model("Caja", cajaSchema)