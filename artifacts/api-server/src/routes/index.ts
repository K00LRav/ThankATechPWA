import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import techniciansRouter from "./technicians";
import jobsRouter from "./jobs";
import thanksRouter from "./thanks";
import pointsRouter from "./points";
import platformRouter from "./platform";
import profileRouter from "./profile";
import stripeRouter from "./stripe";
import pushTokensRouter from "./push-tokens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(techniciansRouter);
router.use(jobsRouter);
router.use(thanksRouter);
router.use(pointsRouter);
router.use(platformRouter);
router.use(profileRouter);
router.use(stripeRouter);
router.use(pushTokensRouter);

export default router;
