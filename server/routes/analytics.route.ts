import { Router } from "express";
import { authorizeRoles, verifyJWT } from "../middleware/auth.middleware";
import { getCoursesAnalytics, getOrdersAnalytics, getUsersAnalytics } from "../controllers/analytics.generator";

const router = Router();

router.route("/get-users-analytics").get(verifyJWT, authorizeRoles("admin"), getUsersAnalytics);
router.route("/get-courses-analytics").get(verifyJWT, authorizeRoles("admin"), getCoursesAnalytics);
router.route("/get-orders-analytics").get(verifyJWT, authorizeRoles("admin"), getOrdersAnalytics);



export default router;