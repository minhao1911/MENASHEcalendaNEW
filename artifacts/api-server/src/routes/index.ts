import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books";
import storageRouter from "./storage";
import holidayInsightsRouter from "./holidayInsights";
import parshaInsightsRouter from "./parshaInsights";
import pushRouter from "./push";
import userRouter from "./user";
import communityYahrzeitRouter from "./communityYahrzeit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(booksRouter);
router.use(storageRouter);
router.use(holidayInsightsRouter);
router.use(parshaInsightsRouter);
router.use(pushRouter);
router.use(userRouter);
router.use("/community", communityYahrzeitRouter);

export default router;
