require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const { register, logoff, logon } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const EventEmitter = require("events");
const jwt = require("jsonwebtoken");

// a few useful globals
let saveRes = null;
let saveData = null;

const cookie = require("cookie");
function MockResponseWithCookies() {
  const res = httpMocks.createResponse({
    eventEmitter: EventEmitter,
  });
  res.cookie = (name, value, options = {}) => {
    const serialized = cookie.serialize(name, String(value), options);
    let currentHeader = res.getHeader("Set-Cookie");
    if (currentHeader === undefined) {
      currentHeader = [];
    }
    currentHeader.push(serialized);
    res.setHeader("Set-Cookie", currentHeader);
  };
  return res;
}

beforeAll(async () => {
  // clear database
  await prisma.task.deleteMany(); // delete all tasks
  await prisma.user.deleteMany(); // delete all users
});

afterAll(() => {
  prisma.$disconnect();
});

let jwtCookie;

describe("testing logon, register, and logoff", () => {
  it("33. A user can be registered.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { name: "Bob", email: "bob@sample.com", password: "Pa$$word20" },
      headers: {
        "x-recaptcha-test": process.env.RECAPTCHA_BYPASS,
      },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(register, req, saveRes);
    expect(saveRes.statusCode).toBe(201); // success!
    saveData = saveRes._getJSONData();
  });
  it("34. The user can logon.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "bob@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(200); // success!
  });
  it("35. A string in the cookie array starts with 'jwt-'", async () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((s) => s.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });
  it("36. That string contains 'HttpOnly;'.  (This is a security test!)", async () => {
    expect(jwtCookie).toContain("HttpOnly");
  });
  it("37. The returned data from the register has the expected name.", async () => {
    expect(saveData.user.name).toBe("Bob");
  });
  it("38. The returned data contains a csrfToken.", async () => {
    expect(saveData.csrfToken).toBeDefined();
  });
  it("39. You can now logoff.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logoff, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
    // saveData = saveRes._getJSONData();
  });
  it("40. The logoff clears the cookie.", async () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toContain("Jan 1970");
  });
  it("41. A logon attempt with a bad password returns a 401.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "bob@sample.com", password: "Pa$$word21" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("42. You can't register with an email address that is already registered.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { name: "Bob", email: "bob@sample.com", password: "Pa$$word20" },
      headers: {
        "x-recaptcha-test": process.env.RECAPTCHA_BYPASS,
      },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(register, req, saveRes);
    expect(saveRes.statusCode).toBe(400);
  });
});

describe("Testing JWT middleware", () => {
  let req = null;
  it("61. jwtMiddleware Returns a 401 if the JWT cookie is not present in the req.", async () => {
    req = httpMocks.createRequest({
      method: "GET",
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("62. Returns a 401 if the JWT is invalid", async () => {
    req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies();
    const jwtCookie = jwt.sign({ id: 5, csrfToken: "badToken" }, "badSecret", {
      expiresIn: "1h",
    });
    req.cookies = { jwt: jwtCookie };
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("63. Returns a 401 if the JWT is valid but the CSRF token isn't.", async () => {
    req = httpMocks.createRequest({
      method: "POST",
    });
    const jwtCookie = jwt.sign(
      { id: 5, csrfToken: "goodToken" },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );
    req.cookies = { jwt: jwtCookie };
    if (!req.headers) {
      req.headers = {};
    }
    req.headers["X-CSRF-TOKEN"] = "badToken";
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("64. Calls next() if both the token and the jwt are good.", async () => {
    req = httpMocks.createRequest({
      method: "POST",
    });
    const jwtCookie = jwt.sign(
      { id: 5, csrfToken: "goodToken" },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );
    req.cookies = { jwt: jwtCookie };
    if (!req.headers) {
      req.headers = {};
    }
    req.headers["X-CSRF-TOKEN"] = "goodToken";
    saveRes = MockResponseWithCookies();
    const next = await waitForRouteHandlerCompletion(
      jwtMiddleware,
      req,
      saveRes,
    );
    expect(next).toHaveBeenCalled();
  });
  it("65. If both the token and the jwt are good, req.user.id has the appropriate value.", async () => {
    expect(req.user.id).toBe(5);
  });
});
