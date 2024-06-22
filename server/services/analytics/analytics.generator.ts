import { Document, Model } from "mongoose";

interface IMonthData {
    month: string;
    count: number;
}


/**
 * Generates data for the last 12 months.
 *
 * @template T - A generic type that extends the Mongoose Document.
 * @param {Model<T>} model - The Mongoose model to query.
 * @returns {Promise<{ last12Months: IMonthData[] }>} - An object containing an array of month data with counts.
 *
 * @example
 * const result = await generateLast12MonthsData(UserModel);
 * console.log(result.last12Months); // [{ month: 'Jan 2023', count: 5 }, ...]
 */
export async function generateLast12MonthsData<T extends Document>(
    model: Model<T>
): Promise<{ last12Months: IMonthData[] }> {

    const last12Months: IMonthData[] = [];

    // Get the current date and move it to the next day to avoid partial month data
    const currentDate = new Date();

    currentDate.setDate(currentDate.getDate() + 1); // Let's say today is 21st June 2024, and if the time is more than 12pm, we'll move it to the next day also i.e tomorrow 22nd June 2024 to avoid partial data.

    // Loop through the last 12 months, starting from the current month and going back
    for (let i = 11; i >= 0; i--) {

        // Calculate the end date of the current month
        const endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - i * 28 // Subtract multiples of 28 days to go back one month at a time. Example: If today is the 15th of January, then the end date of the 12th month would be the 1st of December.
        );

        // Calculate the start date of the current month by subtracting 28 days from endDate
        const startDate = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate() - 28
        );

        // Format the month and year for display
        const monthYear = endDate.toLocaleDateString("default", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });


        // Query the database for the number of documents created between startDate and endDate
        // This counts how many documents in the 'model' collection have a 'createdAt'
        // timestamp that falls within the specified date range.
        const count = await model.countDocuments({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            },
        } as any);

        // Using 'any' to suppress TypeScript errors about the filter object not being assignable to the parameter of type 'FilterQuery<T>'.
        // This is due to TypeScript not being able to confirm that 'createdAt' is a valid field on the model's schema.
        // #TODO / #ENHANCE : Use FilterQuery<T> for better type safety and to ensure the filter object matches the schema definition, such as:
        // const count = await model.countDocuments({
        //     createdAt: { $gte: startDate, $lt: endDate }
        // } as FilterQuery<T>);



        // Push the formatted month and the document count into the last12Months array
        last12Months.push({ month: monthYear, count });

    }

    // Return an object containing the array of last12Months data
    return { last12Months };
}
