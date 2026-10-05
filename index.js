const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// CONFIGURACIÓN
// ================================

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ================================
// BASE DE DATOS
// ================================

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: {
rejectUnauthorized: false
}
});

// ================================
// INICIALIZAR BASE DE DATOS
// ================================

const initDb = async () => {

const queryText = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        role VARCHAR(20) DEFAULT 'tourist',
        stripe_account_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tours (
        id SERIAL PRIMARY KEY,
        guide_id INT REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        scheduled_at TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        tour_id INT REFERENCES tours(id),
        tourist_id INT REFERENCES users(id),
        stripe_payment_intent_id VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'paid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

try {

    await pool.query(queryText);

    console.log('Tablas inicializadas correctamente');

} catch (error) {

    console.error(
        'Error al crear las tablas:',
        error.message
    );

}

};

// Ejecutar inicialización
initDb();

// ================================
// RUTA PRINCIPAL
// ================================

app.get('/', async (req, res) => {

try {

    const result = await pool.query('SELECT NOW()');

    res.json({
        message: 'VeoLive API running!',
        dbTime: result.rows[0].now,
        status: 'Database tables ready'
    });

} catch (error) {

    console.error(error);

    res.status(500).json({
        error: 'Error de conexión con la base de datos'
    });

}

});

// ================================
// CREAR PAGO STRIPE
// ================================

app.post('/api/crear-pago', async (req, res) => {

try {

    const { location, duration } = req.body;

    // -------------------------------
    // VALIDACIÓN
    // -------------------------------

    if (!location || !duration) {

        return res.status(400).json({
            error: 'Faltan datos de la experiencia'
        });

    }

    // -------------------------------
    // PRECIOS
    // -------------------------------

    let amount;
    let durationText;

    if (duration === '15') {

        amount = 1000;
        durationText = '15 minutos';

    } else if (duration === '30') {

        amount = 1800;
        durationText = '30 minutos';

    } else if (duration === '60') {

        amount = 3000;
        durationText = '1 hora';

    } else {

        return res.status(400).json({
            error: 'Duración no válida'
        });

    }

    // -------------------------------
    // CREAR SESIÓN DE STRIPE
    // -------------------------------

    const session = await stripe.checkout.sessions.create({

        payment_method_types: ['card'],

        line_items: [
            {
                price_data: {

                    currency: 'usd',

                    product_data: {
                        name: `Experiencia VeoLive: ${location}`,
                        description: `Duración: ${durationText}`
                    },

                    unit_amount: amount
                },

                quantity: 1
            }
        ],

        mode: 'payment',

        success_url:
            `${req.protocol}://${req.get('host')}/cliente.html?success=true`,

        cancel_url:
            `${req.protocol}://${req.get('host')}/cliente.html?canceled=true`
    });

    // -------------------------------
    // RESPUESTA
    // -------------------------------

    res.json({
        success: true,
        url: session.url
    });

} catch (error) {

    console.error(
        'Error al crear la sesión de Stripe:',
        error
    );

    res.status(500).json({
        error: 'No se pudo crear el pago'
    });

}

});

// ================================
// INICIAR SERVIDOR
// ================================

app.listen(PORT, () => {

console.log(
    `Servidor VeoLive corriendo en el puerto ${PORT}`
);

});

