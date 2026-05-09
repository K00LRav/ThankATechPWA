import { Router, type IRouter } from "express";
import healthRouter from "./health";
import techniciansRouter from "./technicians";
import jobsRouter from "./jobs";
import thanksRouter from "./thanks";
import pointsRouter from "./points";
import platformRouter from "./platform";

const router: IRouter = Router();

router.use(healthRouter);
router.use(techniciansRouter);
router.use(jobsRouter);
router.use(thanksRouter);
router.use(pointsRouter);
router.use(platformRouter);

export default router;
