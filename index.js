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
        password: process.env.RDS_PASSWORD || 'PGIlike2wrestle!', // Make sure to change password and database name
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
        app.set('views', path.join(__dirname, 'views'));
        app.set('view engine', 'ejs');

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
    res.render('externalLanding');
});

// EXTERNAL LANDING - Schedule
app.get('/schedule', (req, res) => {
  res.render('schedule'); // For the schedule page
});

// EXTERNAL LANDING - New Event Submission
app.post('/requestEvent', (req, res) => {
    knex('events')
    .insert({
        event_date_time: req.body.event_date_time,
        event_host_first_name: req.body.event_host_first_name,
        event_host_last_name: req.body.event_host_last_name,
        event_host_email: req.body.event_host_email,
        participants_estimate: req.body.participants_estimate,
        event_type: req.body.event_type,
        event_address: req.body.event_address,
        event_city: req.body.event_city,
        event_state: req.body.event_state,
        event_zip_code: req.body.event_zip_code,
        duration_estimate: req.body.duration_estimate,
        event_host_area_code: req.body.event_host_area_code,
        event_host_phone_number: req.body.event_host_phone_number,
        jen_story: req.body.jen_story,
        status: 'Pending'
    })
    .then(() => {
        // Pass a success message as a query parameter
        res.redirect('/?message=Thank you for requesting to host and event!');
    })
    .catch(error => {
        console.error('Error inserting event:', error);
        res.status(500).send('Internal Server Error');
    })
});

// EXTERNAL LANDING - Volunteer Page/Sign Up
app.get('/volunteer', (req, res) => {
  res.render('volunteer');
});

app.post('/volunteerSignup', (req, res) => {
    knex('volunteers')
    .insert({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        area_code: req.body.area_code,
        phone_number: req.body.phone_number,
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        zip_code: req.body.zip_code,
        referall_source: req.body.referall_source,
        sewing_level: req.body.sewing_level,
        hours_per_month: req.body.hours_per_month,
        title: 'Volunteer',
        username: req.body.username,
        password: req.body.password
    })
    .then(() => {
        // Pass a success message as a query parameter
        res.redirect('/?message=Thank you for signing up to volunteer!');
    })
    .catch(error => {
        console.error('Error inserting event:', error);
        res.status(500).send('Internal Server Error');
    })
});

// EXTERNAL LANDING - Jen's Story Page
app.get('/story', (req, res) => {
  res.render('story'); // Ensure this matches the file name exactly
});

// EXTERNAL LANDING - Event Page
app.get('/event', (req, res) => {
  res.render('event'); // Ensure this renders the correct file
});

// EXTERNAL LANDING - Volunteer Home Page
app.get('/volunteerhome', (req, res) => {
  res.render('volunteerhome'); // Ensure this matches the `volunteerhome.ejs` file
});

// LOGIN - GET & POST
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Ensure both username and password are provided
        if (!username || !password) {
            return res.render('login', { error: 'Username and password are required' });
        }

        // Query the database for the user
        const user = await knex('volunteers')
            .where({ username })
            .andWhere({ title: 'User (Admin)' }) // Add the condition to check the Title
            .first();

        // Query the database for the user
        const volunteer = await knex('volunteers')
            .where({ username })
            .andWhere({ title: 'Volunteer' }) // Add the condition to check the Title
            .first();

        if (user) {
            // Compare the provided password with the stored password (plaintext)
            if (user.password === password) {
                req.session.loggedIn = true;
                req.session.username = username; // Store username in the session
                return res.redirect('/internalLanding');
            }
        }

        if (volunteer) {
          // Compare the provided password with the stored password (plaintext)
          if (volunteer.password === password) {
              req.session.loggedIn = true;
              req.session.username = username; // Store username in the session
              return res.redirect('/eventSignup?username=${username}');
          }
      }

        // If we reach here, either user not found or password mismatch
        res.render('login', { error: 'Invalid username or password' });
    } catch (error) {
        console.error('Error during login:', error);
        res.render('login', { error: 'Something went wrong' });
    }
});

// EVENT SIGNUP PAGE
app.get('/eventSignup', async (req, res) => {
  try {
    const volunteer = await knex('volunteers')
        .select('volunteer_id', 'first_name', 'last_name', 'email')
        .where({ 'username': req.session.username })
        .first();

    if (!volunteer) {
        return res.status(404).send('Volunteer not found.');
    }

    req.session.volunteer = volunteer; // Store volunteer info in session

    const approvedEvents = await knex('events').where({ status: 'Approved' });

    res.render('eventSignup', { approvedEvents, volunteer });
  } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while retrieving the events.');
  }
});

// Post Event to Signups table
app.post('/signupEvent', async (req, res) => {

  const volunteer = req.session.volunteer; // Assuming the volunteer info is stored in the session

  if (!volunteer) {
      return res.status(401).send('Unauthorized: Please log in to sign up.');
  }

  const eventDateTime = new Date(req.body.event_date_time).toISOString(); 

  try {
      await knex('signups').insert({
          event_id: req.body.event_id,
          volunteer_id: volunteer.volunteer_id,
          first_name: volunteer.first_name,
          last_name: volunteer.last_name,
          email: volunteer.email,
          event_date_time: eventDateTime,
          event_host_first_name: req.body.event_host_first_name,
          event_host_last_name: req.body.event_host_last_name,
          event_host_email: req.body.event_host_email,
      });

      res.redirect('/eventSignup');
  } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while signing up for the event.');
  }
});

app.post('/declineEvent', async (req, res) => {
  const { event_id } = req.body;

  const volunteer = req.session.volunteer;

  if (!volunteer) {
      return res.status(401).send('Unauthorized: Please log in to decline an event.');
  }

  try {
      // For example, you could remove the volunteer from the signups table if needed:
      // await knex('signups').where({ event_id, volunteer_id: volunteer.volunteer_id }).del();
    await knex('signups')
    .where({ event_id: event_id, volunteer_id: volunteer.volunteer_id })
    .del();

      res.redirect('/eventSignup'); // Redirect back to the event signup page
  } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while declining the event.');
  }
});

app.get('/viewSignups', async (req, res) => {
  try {
    // Query to get approved events and their corresponding volunteers
    const approvedEvents = await knex('events')
      .leftJoin('signups', 'events.event_id', 'signups.event_id')
      .select(
        'events.event_id',
        'events.event_date_time',
        'events.event_host_first_name',
        'events.event_host_last_name',
        'events.event_host_email',
        'events.event_address',
        'events.event_city',
        'events.event_state',
        'events.event_zip_code',
        'signups.volunteer_id',
        'signups.first_name',
        'signups.last_name',
        'signups.email'
      )
      .where('events.status', 'Approved')
      .orderBy('events.event_date_time');

    // Group volunteers by event
    const eventsWithVolunteers = approvedEvents.reduce((acc, event) => {
      const { event_id, event_date_time, event_host_first_name, event_host_last_name, event_host_email, event_address, event_city, event_state, event_zip_code, volunteer_id, first_name, last_name, email } = event;
      
      if (!acc[event_id]) {
        acc[event_id] = {
          event_id,
          event_date_time,
          event_host_first_name,
          event_host_last_name,
          event_host_email,
          event_address,
          event_city,
          event_state,
          event_zip_code,
          volunteers: []
        };
      }
      
      if (volunteer_id) {
        acc[event_id].volunteers.push({ volunteer_id, first_name, last_name, email });
      }

      return acc;
    }, {});

    // Convert the grouped object back to an array
    const result = Object.values(eventsWithVolunteers);

    res.render('viewSignups', { approvedEvents: result });
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while retrieving the events and signups.');
  }
});


app.post('/removeVolunteer', async (req, res) => {
  try {
    const { event_id, volunteer_id } = req.body;

    // Delete the signup record for the volunteer from the event
    await knex('signups')
      .where({ event_id, volunteer_id })
      .del();

    // Redirect back to the viewSignups page to see the updated list
    res.redirect('/viewSignups');
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while removing the volunteer.');
  }
});

// INTERNAL LANDING - GET
app.get('/internalLanding', isAuthenticated, (req, res) => {
    res.render('internalLanding', { username: req.session.username });
});

// LOGOUT - GET
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// USER MAINTENANCE - GET
app.get('/userMaintenance', (req, res) => {
    knex('volunteers')
      .select(
        'volunteer_id',
        'first_name',
        'last_name',
        'email',
        'area_code',
        'phone_number',
        'street',
        'city',
        'state',
        'zip_code',
        'referall_source',
        'sewing_level',
        'hours_per_month',
        'title',
        'username',
        'password'
      )
      .then(user => {
        res.render('userMaintenance', { user });
      })
      // this says if something goes wrong, it'll do this
      .catch(error => {
        console.error('Error querying database:', error);
        res.status(500).send('Internal Server Error');
      });
  });

// EDIT USER - GET - editing rows
app.get('/editUser/:volunteer_id', (req, res) => {
    const volunteer_id = req.params.volunteer_id;
  
    knex('volunteers')
      .where('volunteer_id', volunteer_id)
      .first() // Retrieve a single record
      .then(user => {
        if (!user) {
          return res.status(404).send('User not found');
        }
        // Pass the retrieved user data to the edit page
        res.render('editUser', { user });
      })
      .catch(error => {
        console.error('Error fetching user for editing:', error);
        res.status(500).send('Internal Server Error');
      });
  });
  

// EDIT USER - POST - editing rows
  app.post('/editUser/:volunteer_id', (req, res) => {
    let volunteer_id = req.params.volunteer_id;
    // Access each value directly from req.body
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const area_code = req.body.area_code;
    const phone_number = req.body.phone_number;
    const street = req.body.street;
    const zip_code = req.body.zip_code;
    const city = req.body.city;
    const state = req.body.state;
    const referall_source = req.body.referall_source;
    const sewing_level = req.body.sewing_level;
    const hours_per_month = parseInt(req.body.hours_per_month); // Convert to integer
    const title = req.body.title;
    const username = req.body.username;
    const password = req.body.password;
    knex('volunteers')
      .where('volunteer_id', volunteer_id)
      .update({
        first_name: first_name,
        last_name: last_name,
        email: email,
        area_code: area_code,
        phone_number: phone_number, // Assuming the column in the database is phone_number
        street: street, // Assuming the column is named 'street'
        zip_code: zip_code,
        city: city,
        state: state,
        referall_source: referall_source, // Assuming typo in your schema is intentional
        sewing_level: sewing_level,
        hours_per_month: hours_per_month,
        title: title,
        username: username,
        password: password
      })
      .then(() => {
        res.redirect('/userMaintenance'); // Redirect to the list of users after saving
      })
      .catch(error => {
        console.error('Error updating User:', error);
        res.status(500).send('Internal Server Error');
      });
  }); 

// DELETE USER - POST - delete a row
app.post('/deleteUser/:volunteer_id', (req, res) => {
    const volunteer_id= req.params.volunteer_id;
    knex('volunteers')
      .where('volunteer_id', volunteer_id)
      .del() // Deletes the record with the specified ID
      .then(() => {
        res.redirect('/userMaintenance'); // Redirect to the users list after deletion
      })
      .catch(error => {
        console.error('Error deleting User:', error);
        res.status(500).send('Internal Server Error');
      });
  });

// ADD USER - GET - adding rows
  app.get('/addUser', (req, res) => {
    // Fetch users types to populate the dropdown
    knex('volunteers')
        .select('volunteer_id')
        .then(user => {
            // Render the add form with the users types data
            res.render('addUser', { user });
        })
        .catch(error => {
            console.error('Error fetching User: ', error);
            res.status(500).send('Internal Server Error');
        });
});

// ADD USER - POST - Adding rows
app.post('/addUser', (req, res) => {
    // Extract form values from req.body
    const first_name = req.body.first_name || ''; // Default to empty string
    const last_name = req.body.last_name || '';
    const email = req.body.email || '';
    const area_code = req.body.area_code || '';
    const phone_number = req.body.phone_number || '';
    const street = req.body.street || '';
    const zip_code = req.body.zip_code || '';
    const city = req.body.city || '';
    const state = req.body.state || '';
    const referall_source = req.body.referall_source || '';
    const sewing_level = req.body.sewing_level || 'Beginner'; // Default to Beginner
    const hours_per_month = parseInt(req.body.hours_per_month, 10) || 0; // Default to 0 hours
    const title = req.body.title || '';
    const username = req.body.username || '';
    const password = req.body.password || ''; // Consider hashing the password for security
  
    // Insert the new volunteerinto the database
    knex('volunteers')
      .insert({
        first_name: first_name,
        last_name: last_name,
        email: email,
        area_code: area_code,
        phone_number: phone_number, // Assuming column in DB is phone_number
        street: street, // Assuming column is 'street'
        zip_code: zip_code,
        city: city,
        state: state,
        referall_source: referall_source, // Correct typo if it's intentional
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
  
  // EVENT MAINTENANCE - GET
  app.get('/eventMaintenance', (req, res) => {
    knex('events')
      .select('*') // Select all columns
      .orderBy('status', 'asc') // Order by Status (ascending) and optionally by Event_Date_Time
      .then(events => {
        // Categorize events by status
        const categorizedEvents = {
          Pending: [],
          Approved: [],
          Declined: [],
          Completed: []
        };
  
        events.forEach(event => {
          if (categorizedEvents[event.status]) {
            categorizedEvents[event.status].push(event);
          }
        });
  
        // Render the EJS view and pass the categorized data
        res.render('eventMaintenance', { categorizedEvents });
      })
      .catch(err => {
        console.error('Error fetching events:', err);
        res.status(500).send('An error occurred while loading the events maintenance page.');
      });
  });

  app.get('/addEvent', (req, res) => {
    res.render('addEvent');
  });

  app.post('/addEvent', (req, res) => {
    knex('events')
        .insert({
            event_date_time: req.body.event_date_time,
            event_host_first_name: req.body.event_host_first_name,
            event_host_last_name: req.body.event_host_last_name,
            event_host_email: req.body.event_host_email,
            participants_estimate: req.body.participants_estimate,
            event_type: req.body.event_type,
            event_address: req.body.event_address,
            event_city: req.body.event_city,
            event_state: req.body.event_state,
            event_zip_code: req.body.event_zip_code,
            duration_estimate: req.body.duration_estimate,
            event_host_area_code: req.body.event_host_area_code,
            event_host_phone_number: req.body.event_host_phone_number,
            jen_story: req.body.jen_story,
            status: 'Pending'
            // participant_actual:
            // duration_actual:
            // pockets_produced:
            // collars_produced:
            // envelopes_produced:
            // vests_produced:
            // completed_products:
            // satisfaction_rating:
            // feedback:
            // comments:
        }).then(() => res.redirect('/eventMaintenance'))
        .catch(error => {
            console.error('Error inserting event:', error);
            res.status(500).send('Internal Server Error');
        });
  });

  app.post('/deleteEvent/:id', (req, res) => {
    knex('events')
        .where('event_id', req.params.id)
        .del()
        .then(() => res.redirect('/eventMaintenance'))
        .catch(err => res.status(500).json({ err }));
  })

  app.get('/editEvent/:id' ,(req, res) => {
    knex('events')
        .select('*')
        .where('event_id', req.params.id)
        .then(events => {
            if (events.length > 0) {
                res.render('editEvent', { myevent: events[0] });
            } else {
                res.status(404).send('Event not found');
            }
        })
        .catch(err => {
            console.error('Error fetching event:', err);
            res.status(500).json({ err });
        });
  });

  app.post('/editEvent/:id', (req, res) => {
    console.log(req.body);
    knex('events')
        .where('event_id', parseInt(req.params.id))
        .update({
            event_date_time: req.body.event_date_time || null,  // Set default if undefined
            event_host_first_name: req.body.event_host_first_name || '',
            event_host_last_name: req.body.event_host_last_name || '',
            event_host_email: req.body.event_host_email || '',
            event_host_area_code: req.body.event_host_area_code || '', 
            event_host_phone_number: req.body.event_host_phone_number || '',
            event_type: req.body.event_type || '',
            event_address: req.body.event_address || '',
            event_city: req.body.event_city || '',
            event_state: req.body.event_state || '',
            event_zip_code: req.body.event_zip_code || '',
            duration_estimate: req.body.duration_estimate || 0,
            participants_estimate: req.body.participants_estimate || 0,
            jen_story: req.body.jen_story || '',
            status: req.body.status || ''
        })
        .then(() => res.redirect('/eventMaintenance'))
        .catch(err => {
            console.error('Error updating event:', err);
            res.status(500).send('Internal Server Error');
        });
});

// VOLUNTEER MAINTENANCE - GET
app.get('/volunteerMaintenance', (req, res) => {
  knex('volunteers')
    .select(
      'volunteer_id',
      'first_name',
      'last_name',
      'email',
      'area_code',
      'phone_number',
      'street',
      'city',
      'state',
      'zip_code',
      'referall_source',
      'sewing_level',
      'hours_per_month',
      'title',
      'username',
      'password'
    )
    .then(volunteer => {
      res.render('volunteerMaintenance', { volunteer });
    })
    // this says if something goes wrong, it'll do this
    .catch(error => {
      console.error('Error querying database:', error);
      res.status(500).send('Internal Server Error');
    });
});


// EDIT VOLUNTEER - GET - editing rows
app.get('/editVolunteer/:volunteer_id', (req, res) => {
  const volunteer_id = req.params.volunteer_id;

  knex('volunteers')
    .where('volunteer_id', volunteer_id)
    .first() // Retrieve a single record
    .then(volunteer => {
      if (!volunteer) {
        return res.status(404).send('Volunteer not found');
      }
      // Pass the retrieved volunteerdata to the edit page
      res.render('editVolunteer', { volunteer });
    })
    .catch(error => {
      console.error('Error fetching volunteer for editing:', error);
      res.status(500).send('Internal Server Error');
    });
});


// EDIT VOLUNTEER - POST - editing rows
app.post('/editVolunteer/:volunteer_id', (req, res) => {
  let volunteer_id = req.params.volunteer_id;
  // Access each value directly from req.body
  const first_name = req.body.first_name;
  const last_name = req.body.last_name;
  const email = req.body.email;
  const area_code = req.body.area_code;
  const phone_number = req.body.phone_number;
  const street = req.body.street;
  const zip_code = req.body.zip_code;
  const city = req.body.city;
  const state = req.body.state;
  const referall_source = req.body.referall_source;
  const sewing_level = req.body.sewing_level;
  const hours_per_month = parseInt(req.body.hours_per_month); // Convert to integer
  const title = req.body.title;
  const username = req.body.username;
  const password = req.body.password;
  knex('volunteers')
    .where('volunteer_id', volunteer_id)
    .update({
      first_name: first_name,
      last_name: last_name,
      email: email,
      area_code: area_code,
      phone_number: phone_number, // Assuming the column in the database is phone_number
      street: street, // Assuming the column is named 'street'
      zip_code: zip_code,
      city: city,
      state: state,
      referall_source: referall_source, // Assuming typo in your schema is intentional
      sewing_level: sewing_level,
      hours_per_month: hours_per_month,
      title: title,
      username: username,
      password: password
    })
    .then(() => {
      res.redirect('/volunteerMaintenance'); // Redirect to the list of volunteer after saving
    })
    .catch(error => {
      console.error('Error updating volunteer:', error);
      res.status(500).send('Internal Server Error');
    });
}); 

// DELETE VOLUNTEER - POST - delete a row
app.post('/deleteVolunteer/:volunteer_id', (req, res) => {
  const volunteer_id= req.params.volunteer_id;
  knex('volunteers')
    .where('volunteer_id', volunteer_id)
    .del() // Deletes the record with the specified ID
    .then(() => {
      res.redirect('/volunteerMaintenance'); // Redirect to the volunteer list after deletion
    })
    .catch(error => {
      console.error('Error deleting volunteer:', error);
      res.status(500).send('Internal Server Error');
    });
});

// ADD VOLUNTEER - GET - adding rows
app.get('/addVolunteer', (req, res) => {
  // Fetch volunteer types to populate the dropdown
  knex('volunteers')
      .select('volunteer_id')
      .then(volunteer => {
          // Render the add form with the volunteer types data
          res.render('addVolunteer', { volunteer });
      })
      .catch(error => {
          console.error('Error fetching volunteer: ', error);
          res.status(500).send('Internal Server Error');
      });
});

// ADD VOLUNTEER - POST - Adding rows
app.post('/addVolunteer', (req, res) => {
  // Extract form values from req.body
  const first_name = req.body.first_name || ''; // Default to empty string
  const last_name = req.body.last_name || '';
  const email = req.body.email || '';
  const area_code = req.body.area_code || '';
  const phone_number = req.body.phone_number || '';
  const street = req.body.street || '';
  const zip_code = req.body.zip_code || '';
  const city = req.body.city || '';
  const state = req.body.state || '';
  const referall_source = req.body.referall_source || '';
  const sewing_level = req.body.sewing_level || 'Beginner'; // Default to Beginner
  const hours_per_month = parseInt(req.body.hours_per_month, 10) || 0; // Default to 0 hours
  const title = req.body.title || '';
  const username = req.body.username || '';
  const password = req.body.password || ''; // Consider hashing the password for security

  // Insert the new volunteer into the database
  knex('volunteers')
    .insert({
      first_name: first_name,
      last_name: last_name,
      email: email,
      area_code: area_code,
      phone_number: phone_number, // Assuming column in DB is phone_number
      street: street, // Assuming column is 'street'
      zip_code: zip_code,
      city: city,
      state: state,
      referall_source: referall_source, // Correct typo if it's intentional
      sewing_level: sewing_level,
      hours_per_month: hours_per_month,
      title: title,
      username: username,
      password: password // Store securely in production
    })
    .then(() => {
      res.redirect('/volunteerMaintenance'); // Redirect to the maintenance page after adding
    })
    .catch(error => {
      console.error('Error adding volunteer:', error);
      res.status(500).send('Internal Server Error');
    });
});

// TABLEAU
app.get('/tableauDash', (req, res) => {
    res.render('tableauDash'); // your-template-file.ejs or .html
  });

// Listening on port 3000
app.listen(port, () => console.log("Listening"))