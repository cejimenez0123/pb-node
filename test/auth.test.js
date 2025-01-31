

const nodemailer = require('nodemailer')
const routes = require('../routes/auth'); // The auth.js file with the route
const express =require("express")
const bodyParser = require("body-parser");
const { faker } = require('@faker-js/faker');
const { PrismaClient } = require('@prisma/client');
const request = require('supertest');; // Mocked version
const authMiddleware = jest.fn((req, res, next) => next());
const app = express();
const approvalTemplate = require("../html/approvalTemplate");
const { beforeEach, afterEach } = require('node:test');
jest.mock('nodemailer');
const sendMailMock = jest.fn();
nodemailer.createTransport.mockReturnValueOnce({ sendMail: sendMailMock });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use("/auth",routes(authMiddleware));


jest.mock('nodemailer');

console.log('DATABASE_URL:', process.env.DATABASE_URL);

describe('Application and Review Flow', () => {
  let prisma;
  let sendMailMock
  beforeAll(async () => {
    prisma = new PrismaClient();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    sendMailMock = jest.fn().mockResolvedValue('Email sent');
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });
  });
   let fullName = faker.person.fullName()
  let email = faker.internet.email()
  let handle = faker.internet.username()
  let password = faker.internet.password()
  email = faker.internet.email()
  handle = faker.internet.username()
const applicationData = {
        fullName: fullName,
        email: email,
        igHandle: handle,
        genres:[],
        whyApply: '',
        password:password
      };
  it('should handle the application flow and send approval email', async () => {
    // Step 1: User applies through `auth/apply`
    const applyResponse = await request(app)
      .post('/auth/apply')
      .set('Content-Type', 'application/json')
          .send(applicationData)
 

    expect(applyResponse.status).toBe(201);
   
    expect(applyResponse.body.message).toBe('Applied Successfully!');

    expect(applyResponse.body).toHaveProperty('path'); // Token is generated
    const path = applyResponse.body.path;

    // Step 2: Reviewer reviews with `auth/review`
    const reviewResponse = await request(app)
    .get(path)
    .set('Content-Type', 'application/json')


    expect(reviewResponse.status).toBe(200);

    expect(reviewResponse).toHaveProperty("body")
    expect(reviewResponse.body).toHaveProperty("token")
    expect(reviewResponse.body).toHaveProperty("message","User approve'd successfully")
    expect(sendMailMock).toHaveBeenCalled();

    const signupLink =   process.env.DOMAIN+ `/signup?token=${reviewResponse.body.token}`
    const template = approvalTemplate({name:fullName,signupLink,email:email})
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining(template))
     let params = {token:reviewResponse.body.token,email,password:"password",username:handle,
      profilePicture:"",selfStatement:"",privacy:false
     }
const registerResponse = await request(app)

.post("/auth/register")
.set('Content-Type', 'application/json')
.send(params)

expect(registerResponse.status).toBe(200);
expect(registerResponse).toHaveProperty("body")
expect(registerResponse.body).toHaveProperty("profile")
expect(registerResponse.body).toHaveProperty("token")

  });

  it('should fail to send approval email if token is invalid', async () => {
    const invalidToken = 'INVALID TOKEN';
    const reviewResponse = await request(app)
    .get(`/auth/review?applicantId=${invalidToken}`)
    .set('Content-Type', 'application/json');
    expect(reviewResponse.status).toBe(409);
  
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
   
    await prisma.$disconnect();
  });
});


