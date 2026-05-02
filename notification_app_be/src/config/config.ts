export const config = {
  email: process.env.EMAIL as string,
  name: process.env.NAME as string,
  rollNo: process.env.ROLL_NO as string,
  accessCode: process.env.ACCESS_CODE as string,
  clientID: process.env.CLIENT_ID as string,
  clientSecret: process.env.CLIENT_SECRET as string,
  port: parseInt(process.env.PORT || '3002', 10),
  baseUrl: process.env.BASE_URL as string,
};
