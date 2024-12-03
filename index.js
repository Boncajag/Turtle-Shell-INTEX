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
        password: process.env.RDS_PASSWORD || 'byhisgrace' || 'Datapandas20', // Make sure to change password and database name
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

        // Middleware to check if user is logged in
        function isAuthenticated(req, res, next) {
            if (req.session.loggedIn) {
                return next();
            }
            res.redirect('/login');
        }

        const saltRounds = 10;

        // Example of hashing a password
        const password = 'Doe';
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) throw err;
            console.log('Hashed password:', hash);
        });

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
    const { username, password } = req.body;
    try {
        // Check if username and password are provided
        if (!username || !password) {
            return res.render('login', { error: 'Username and password are required' });
        }

        // Query the database for the user
        const user = await knex('volunteers').where({ username }).first();

        // Handle case where user is not found
        if (!user || !user.password_hash) {
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

// user Maintenance - GET
// Root route to display Pokemon records (home page)
app.get('/', (req, res) => {
    knex('Turtle-Shell-INTEX')
      .select(
        'volunteer_id',
        'first_name',
        'last_name',
        'email',
        'area_code',
        'phone_number',
        'address',
        'zip_code',
        'city',
        'state',
        'referral_source',
        'sewing_level',
        'hours_per_month',
        'title',
        'username',
        'password'
      )
      .then(user => {
        res.render('index', { user });
      })
      // this says if something goes wrong, it'll do this
      .catch(error => {
        console.error('Error querying database:', error);
        res.status(500).send('Internal Server Error');
      });
  });

  // user Maintenance - GET - editing rows
  app.get('/editMaintenance/:volunteer_id', (req, res) => {
    let volunteer_id = req.params.volunteer_id;
    knex('Turtle-Shell-INTEX')
      .where('volunteer_id', volunteer_id)
      .first()
      .then(user => {
        if (!user) {
          return res.status(404).send('User not found');
        }
      })
      .catch(error => {
        console.error('Error fetching User for editing:', error);
        res.status(500).send('Internal Server Error');
      });
  });

// user Maintenance - POST - editing rows
  app.post('/editMaintenance/:volunteer_id', (req, res) => {
    let volunteer_id = req.params.volunteer_id;
    // Access each value directly from req.body
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const area_code = req.body.area_code;
    const phone_number = req.body.phone;
    const address = req.body.address;
    const zip_code = req.body.zip_code;
    const city = req.body.city;
    const state = req.body.state;
    const referral_source = req.body.referral_source;
    const sewing_level = req.body.sewing_level;
    const hours_per_month = parseInt(req.body.hours_per_month); // Convert to integer
    const title = req.body.title;
    const username = req.body.username;
    const password = req.body.password;
    // Update the Pokémon in the database
    knex('Turtle-Shell-INTEX')
      .where('volunteer_id', volunteer_id)
      .update({
        first_name: first_name,
        last_name: last_name,
        email: email,
        area_code: area_code,
        phone_number: phone_number, // Assuming the column in the database is phone_number
        street: address, // Assuming the column is named 'street'
        zip_code: zip_code,
        city: city,
        state: state,
        referall_source: referral_source, // Assuming typo in your schema is intentional
        sewing_level: sewing_level,
        hours_per_month: hours_per_month,
        title: title,
        username: username,
        password: password
      })
      .then(() => {
        res.redirect('/userMaintenance'); // Redirect to the list of Pokémon after saving
      })
      .catch(error => {
        console.error('Error updating User:', error);
        res.status(500).send('Internal Server Error');
      });
  }); 

// user Maintenance - POST - delete a row
app.post('/deleteUser/:volunteer_id', (req, res) => {
    const volunteer_id= req.params.volunteer_id;
    knex('Turtle-Shell-INTEX')
      .where('volunteer_id', volunteer_id)
      .del() // Deletes the record with the specified ID
      .then(() => {
        res.redirect('/userMaintenance'); // Redirect to the Pokémon list after deletion
      })
      .catch(error => {
        console.error('Error deleting User:', error);
        res.status(500).send('Internal Server Error');
      });
  });

// user Maintenance - GET - adding rows
  app.get('/addUser', (req, res) => {
    // Fetch Pokémon types to populate the dropdown
    knex('Turtle-Shell-INTEX')
        .select('volunteer_id')
        .then(user => {
            // Render the add form with the Pokémon types data
            res.render('addUser', { user });
        })
        .catch(error => {
            console.error('Error fetching User: ', error);
            res.status(500).send('Internal Server Error');
        });
});



// User Maintenance - POST - Adding rows
app.post('/addUser', (req, res) => {
    // Extract form values from req.body
    const first_name = req.body.first_name || ''; // Default to empty string
    const last_name = req.body.last_name || '';
    const email = req.body.email || '';
    const area_code = req.body.area_code || '';
    const phone_number = req.body.phone || '';
    const address = req.body.address || '';
    const zip_code = req.body.zip_code || '';
    const city = req.body.city || '';
    const state = req.body.state || '';
    const referral_source = req.body.referral_source || '';
    const sewing_level = req.body.sewing_level || 'Beginner'; // Default to Beginner
    const hours_per_month = parseInt(req.body.hours_per_month, 10) || 0; // Default to 0 hours
    const title = req.body.title || '';
    const username = req.body.username || '';
    const password = req.body.password || ''; // Consider hashing the password for security
  
    // Insert the new user into the database
    knex('Turtle-Shell-INTEX')
      .insert({
        first_name: first_name,
        last_name: last_name,
        email: email,
        area_code: area_code,
        phone_number: phone_number, // Assuming column in DB is phone_number
        street: address, // Assuming column is 'street'
        zip_code: zip_code,
        city: city,
        state: state,
        referral_source: referral_source, // Correct typo if it's intentional
        sewing_level: sewing_level,
        hours_per_month: hours_per_month,
        title: title,
        username: username,
        password: password // Store securely in production
      })
      .then(() => {
        res.redirect('/userMaintenance'); // Redirect to the maintenance page after adding
      })
      .catch(error => {
        console.error('Error adding user:', error);
        res.status(500).send('Internal Server Error');
      });
  });
  

// Listening on port 3000
app.listen(port, () => console.log("Listening"))