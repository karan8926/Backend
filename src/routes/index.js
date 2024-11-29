const {Router} = require('express');
const { pantientSignUp , pantientSignIn , bookAppointment , getPatient} = require('../controllers/patients_controllers');
const {AddTherapist, getTherapist , AddTherapistAvailability, getTherapistAvailability, loginTherapist} = require('../controllers/therapist_controllers');
const {loginAdmin } = require('../controllers/admin_controllers');

const router = Router();

router.post('/patient-signup', pantientSignUp);
router.post('/patient-signin', pantientSignIn);
router.get('/getpatient', getPatient);

router.post('/AddTherapist', AddTherapist);
router.get('/getTherapist', getTherapist);


router.post('/AddTherapistAvailability', AddTherapistAvailability);
router.get("/getTherapistAvailability", getTherapistAvailability)

router.post("/book-appointment", bookAppointment);

router.post("/admin-login",loginAdmin )
router.post("/therapist-login", loginTherapist )




module.exports = router;