const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Función para inicializar las tablas de la base de datos
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
  } catch (err) {
    console.error('Error al crear tablas:', err.message);
  }
};

// Inicializar tablas al arrancar
initDb();

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: 'Veolive API running!', 
      dbTime: result.rows[0].now,
      status: 'Database tables ready'
    });
  } catch (err) { 
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Ruta para crear la sesión de pago global
application.post('/api/crear-pago', async (req, res) => {
    try {
        const { location, duration } = req.body;

        // Definir precio según la duración seleccionada (en centavos de dólar)
        let amount = 1800; // Por defecto 30 min (US$ 18.00)
        if (duration === '15') amount = 1000;  // US$ 10.00
        if (duration === '60') amount = 3000;  // US$ 30.00

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Experiencia en vivo: ${location}`,
                        description: `Duración: ${duration} minutos`,
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `https://${req.get('host')}/exito.html`,
            cancel_url: `https://${req.get('host')}/cliente.html`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error al crear la sesión de pago:', error);
        res.status(500).json({ error: 'No se pudo procesar el pago' });
    }
});const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(express.static('.')); // Para que lea tu cliente.html

// Ruta para crear la sesión de pago en Stripe
app.post('/api/crear-pago', async (req, res) => {
    try {
        const { location, duration } = req.body;

        // Definir precios según duración
        let amount = 1800; // Por defecto 30 mins (US$ 18.00)
        let durationText = "30 minutos";

        if (duration === '15') {
            amount = 1000; // US$ 10.00
            durationText = "15 minutos";
        } else if (duration === '60') {
            amount = 3000; // US$ 30.00
            durationText = "1 hora";
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Experiencia VeoLive: ${location}`,
                        description: `Duración: ${durationText}`,
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/cliente.html?success=true`,
            cancel_url: `${req.protocol}://${req.get('host')}/cliente.html?canceled=true`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error al crear la sesión de Stripe:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

