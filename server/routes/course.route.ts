import { Router } from "express";
import { editCourse, uploadCourse } from "../controllers/course.controller";
import { authorizeRoles, verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.route("/create-course").post(verifyJWT, authorizeRoles("admin"), uploadCourse);
router.route("/edit-course/:id").post(verifyJWT, authorizeRoles("admin"), editCourse);

export default router;