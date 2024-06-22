import { Router } from "express";
import { authorizeRoles, verifyJWT } from "../middleware/auth.middleware";
import { getAnalytics } from "../controllers/analytics.generator";
import { Order } from "../models/order.models";
import { Course } from "../models/course.models";
import { User } from "../models/user.models";

const router = Router();

router.get("/get-users-analytics", verifyJWT, authorizeRoles("admin"), getAnalytics(User));
router.get("/get-courses-analytics", verifyJWT, authorizeRoles("admin"), getAnalytics(Course));
router.get("/get-orders-analytics", verifyJWT, authorizeRoles("admin"), getAnalytics(Order));



export default router;