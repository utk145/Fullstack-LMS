import { Router } from "express";
import { editCourse, getAllCourses, getSingleCourse, uploadCourse } from "../controllers/course.controller";
import { authorizeRoles, verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.route("/create-course").post(verifyJWT, authorizeRoles("admin"), uploadCourse);
router.route("/edit-course/:id").post(verifyJWT, authorizeRoles("admin"), editCourse);
router.route("/get-single-course-details/:id").get(getSingleCourse)
router.route("/get-all-course-details").get(getAllCourses)

export default router;