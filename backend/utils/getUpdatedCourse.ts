import { Course } from "../models";
import { getCommonInclude, getCommonOrder } from "./courseFetching";

async function getUpdatedCourse(courseId: number): Promise<Course | null> {
  const commonAttributes = { exclude: ["teacherId", "registrationPasswordHash"] };
  const commonInclude = getCommonInclude(false);
  const commonOrder = getCommonOrder();

  const editedCourse = await Course.findByPk(courseId, {
    attributes: commonAttributes,
    include: commonInclude,
    order: commonOrder,
  });

  return editedCourse;
}

export default getUpdatedCourse;
