const {Router} = require('express');
const { pantientSignUp , pantientSignIn , bookAppointment , getPatient, allAppointment} = require('../controllers/patients_controllers');
const {AddTherapist, getTherapist , AddTherapistAvailability, getTherapistAvailability, 
    loginTherapist, getTherapistSpecialtyRegion, updateAppointmentStatus, getTherapistDetailsByIdAndStatus,
    getTherapistDetailsById} = require('../controllers/therapist_controllers');
const {loginAdmin} = require('../controllers/admin_controllers');

const router = Router();

router.post('/patient-signup', pantientSignUp);
router.post('/patient-signin', pantientSignIn);
router.get('/getpatient', getPatient);

router.post('/AddTherapist', AddTherapist);
router.get('/getTherapist', getTherapist);


router.post('/AddTherapistAvailability', AddTherapistAvailability);
router.get("/getTherapistAvailability", getTherapistAvailability);

//get therapist details with by id
router.get("/getTherapistDetailsByIdAndStatus", getTherapistDetailsByIdAndStatus)
router.get("/getTherapistDetailsById", getTherapistDetailsById)

router.post("/book-appointment", bookAppointment);
router.get("/allAppointment", allAppointment);
router.post("/updateAppointmentStatus", updateAppointmentStatus)

router.post("/admin-login",loginAdmin )
router.post("/therapist-login", loginTherapist )

router.get("/getTherapistSpecialtyRegion", getTherapistSpecialtyRegion);




module.exports = router;