const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const routes = require('../routes/auth'); // The auth.js file with the route
const express =require("express")
const bodyParser = require("body-parser");
const { faker } = require('@faker-js/faker');
// // Mocking nodemailer transporter to avoid sending real emails
jest.mock('nodemailer');
const sendMailMock = jest.fn();
nodemailer.createTransport.mockReturnValueOnce({ sendMail: sendMailMock });
const authMiddleware = jest.fn((req, res, next) => next());
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use("/auth",routes(authMiddleware));


// // Mocking nodemailer to avoid sending real emails during tests
jest.mock('nodemailer');
const prisma = new PrismaClient();


describe('Auth API', () => {
  beforeAll(async () => {
//     // You can use a separate test database or in-memory MongoDB like `mongodb-memory-server`
    await prisma.$connect(process.env.TEST_DATABASE_URL);
  });
  let user = null
  afterAll(async () => {
    // Clean up data after each test if necessary
    if(user){
    await prisma.user.delete({where:{id:user.id}})
}
  });
  test('should submit an application and send a confirmation email', async () => {

    const applicationData = {
      fullName: 'John Doe',
      email: 'testmcgee@example.com',
      igHandle: 'handle',
      genres:[],
      whyApply: '',
      password:"TEST_PASSWORD"
    };
  
    const response = await request(app)
      .post('/auth/apply')
      .expect("Content-Type", /json/)
      .send(applicationData)
      .expect(201); // Expect a 201 status code
  console.log(response.body)

    // Check if the message is correct
    expect(response.body.message).toBe('Applied Successfully!');
  
    // Check if the response includes a 'user' property
    expect(response.body).toHaveProperty('user');
    user = response.body.user
   expect(response.body.user).toHaveProperty('email', 'testmcgee@example.com');
   

  })
  afterAll(async () => {
    // Close the Prisma connection after tests
    await prisma.$disconnect();
  });

  it('should register a new user and send a confirmation email', async () => {
    // Mock Nodemailer transport
    
    // const sendMailMock = jest.fn();
    // nodemailer.createTransport.mockReturnValueOnce({ sendMail: sendMailMock });


    const newUser = {
      email:'johndoe@example.com',
      passowrd:"TEST_PASSWORD",
      profilePicture:null,
      token:faker.string.hexadecimal(),
      selfStatement:"",
      privacy:false,
      uId:null,username:"JONNY",

    }

    // Perform the POST request to register the user
   try{
    const response = await request(app)
      .post('/auth/register')
      .expect("Content-Type", /json/)
      .send(newUser)
      .expect(201);

    // Check the response
    expect(response.body.message).toBe('User registered successfully!');
    expect(response.body.user.email).toBe(newUser.email);
    expect(response.body.user.username).toBe(newUser.username);

    // Verify that the email was sent
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: newUser.email,
        subject: 'Registration Successful',
        text: `Hello ${newUser.username}, welcome to our app!`,
      })
    );
  }catch(error){
    console.log(error)
  }
    // // Verify that the user was saved in the database
    // const savedUser = await prisma.user.findUnique({
    //   where: { email: newUser.email },
    // });
    // expect(savedUser).toBeTruthy();
    // expect(savedUser.email).toBe(newUser.email);
  });
})
