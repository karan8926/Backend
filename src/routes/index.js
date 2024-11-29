const {Router} = require('express');
const { pantientSignUp , pantientSignIn , bookAppointment , getPatient} = require('../controllers/patients_controllers');
const {AddTherapist, AddTherapistAvailability, getTherapistAvailability} = require('../controllers/therapist_controllers');
const {loginAdmin } = require('../controllers/admin_controllers');

const router = Router();

router.post('/pantient-signup', pantientSignUp);
router.post('/patient-signin', pantientSignIn);
router.get('/getpatient', getPatient);

router.post('/AddTherapist', AddTherapist);
router.post('/AddTherapistAvailability', AddTherapistAvailability);
router.get("/getTherapistAvailability", getTherapistAvailability)

router.post("/book-appointment", bookAppointment);

router.post("/admin-login",loginAdmin )




module.exports = router;