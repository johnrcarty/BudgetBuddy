import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage, sessionStore } from "./storage";
import { User as SelectUser, userRegisterSchema, userLoginSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Authentication middleware for protected routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function setupAuth(app: Express) {
  // Create a random session secret
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
  
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy for username/password authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Set up serialization and deserialization for sessions
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate the registration data
      const validatedData = userRegisterSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create the user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(400).json({ error: "Invalid registration data" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    try {
      // Validate the login data
      userLoginSchema.parse(req.body);
      
      passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ error: info?.message || "Authentication failed" });
        
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          // Return sanitized user object (ensure it's a UserWithPassword type that has the password property)
          // Cast to any to safely handle the password property which might not be on the User type
          const userData = user as any;
          const { password, ...userWithoutPassword } = userData;
          return res.status(200).json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(400).json({ error: "Invalid login data" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      return res.status(200).json({ message: "Logout successful" });
    });
  });

  // Current user endpoint
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.status(200).json(req.user);
    }
    return res.status(401).json({ error: "Not authenticated" });
  });
}