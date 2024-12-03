let express = require('express');//Bring in express
let app = express();//Create express object
let path = require('path');//Bring in path
const port = process.env.PORT || 3000;//Specify the port
let security = false;

const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));//Set path to public/images folder

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to pgAdmin
const knex = require('knex') ({
    client : 'pg',
    connection : {
        host : process.env.RDS_HOSTNAME || 'localhost',
        user : process.env.RDS_USERNAME || 'postgres',
        password: process.env.RDS_PASSWORD || 'byhisgrace', // Make sure to change password and database name
        database : process.env.RDS_DB_NAME || 'Turtle-Shell-INTEX',
        port : process.env.RDS_PORT || 5432,
        ssl : process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
});

// --- SECURITY ---
        // Middleware setup
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(session({
            secret: 'yourSecretKey', // Replace with a strong secret key
            resave: false,
            saveUninitialized: true,
        }));

        // Dummy user credentials
        const user = {
            username: 'admin',
            password: 'password123', // In production, use hashed passwords
        };

        // Middleware to check if user is logged in
        function isAuthenticated(req, res, next) {
            if (req.session.loggedIn) {
                return next();
            }
            res.redirect('/login');
        }

// --- ROUTES ---

// EXTERNAL LANDING - GET
app.get('/', (req, res) => {
    res.render('/externalLanding');
});

// LOGIN - GET & POST
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body
    try {
        // Query the database for the user
        const user = await knex('users').where({ username }).first();

        if (!user) {
            return res.render('login', { error: 'Invalid username or password' });
        }

        // Compare the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (isPasswordValid) {
            req.session.loggedIn = true;
            req.session.username = username; // Store username in session
            res.redirect('/internalLanding');
        } else {
            res.render('login', { error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.render('login', { error: 'Something went wrong' });
    }
});

// app.get('/internalLanding', isAuthenticated, (req, res) => {

// INTERNAL LANDING - GET
app.get('/internalLanding', (req, res) => {
    res.render('internalLanding', { username: req.session.username });
});

// LOGOUT - GET
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Listening on port 3000
app.listen(port, () => console.log("Listening"))