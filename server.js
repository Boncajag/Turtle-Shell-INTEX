const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files like CSS
app.set('view engine', 'ejs'); // Use EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory

// Mock Database
let events = [
    { name: 'Vest Assembly', date: '2024-12-10', location: 'Provo, UT', description: 'A group activity to assemble Turtle Shelter vests.' },
    { name: 'Donation Drive', date: '2024-12-15', location: 'Salt Lake City, UT', description: 'A community drive to collect donations for materials.' }
];

// Routes

// Render Landing Page
app.get('/', (req, res) => {
    res.render('external.landing.ejs');
});

// Render Schedule Page
app.get('/schedule', (req, res) => {
    res.render('schedule'); // For the schedule page
});

// Handle New Event Submission
app.post('/add-event', (req, res) => {
    const { name, date, location, description } = req.body;

    // Add the new event to the mock database
    events.push({ name, date, location, description });

    // Redirect back to the schedule page
    res.redirect('/schedule');
});

// Render Volunteer Page
app.get('/volunteer', (req, res) => {
    res.render('volunteer');
});

// Handle Volunteer Sign-Up
app.post('/volunteer-signup', (req, res) => {
    const {
        first_name,
        last_name,
        email,
        area_code,
        phone_number,
        street,
        city,
        state,
        zip_code,
        how_they_heard,
        sewing_level,
        hours_month
    } = req.body;

    console.log(`New Volunteer: ${first_name} ${last_name}`);
    console.log(req.body); // Log the form data for debugging

    // Send a temporary response
    res.send('Thank you for signing up to volunteer!');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
// Jen's Story Page
app.get('/story', (req, res) => {
    res.render('story'); // Ensure this matches the file name exactly
});

// Event Page
app.get('/event', (req, res) => {
    res.render('event'); // Ensure this renders the correct file
});

//Volunteerhome page
app.get('/volunteerhome', (req, res) => {
    res.render('volunteerhome'); // Ensure this matches the `volunteerhome.ejs` file
});
