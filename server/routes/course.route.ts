import { Router } from "express";
import { addQuestion, addReplyToReviews, addReviewInCourse, deleteCourse, editCourse, getAllCourses, getAllCoursesForAdmin, getCourseAccessibleByUser, getSingleCourse, replyToQuestion, uploadCourse } from "../controllers/course.controller";
import { authorizeRoles, verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.route("/create-course").post(verifyJWT, authorizeRoles("admin"), uploadCourse);
router.route("/edit-course/:id").post(verifyJWT, authorizeRoles("admin"), editCourse);
router.route("/get-single-course-details/:id").get(getSingleCourse)
router.route("/get-all-course-details").get(getAllCourses)
router.route("/get-user-course/:id").get(verifyJWT, getCourseAccessibleByUser);
router.route("/add-question").post(verifyJWT, addQuestion);
router.route("/reply-to-question").post(verifyJWT, replyToQuestion);
router.route("/add-review/:id").post(verifyJWT, addReviewInCourse);
router.route("/add-review-reply").post(verifyJWT, authorizeRoles("admin"), addReplyToReviews);
router.route("/get-all-courses-for-admin").get(verifyJWT, authorizeRoles("admin"), getAllCoursesForAdmin);
router.route("/delete-course/:id").delete(verifyJWT, authorizeRoles("admin"), deleteCourse);

export default router;