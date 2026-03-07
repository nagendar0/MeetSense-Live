/**
 * Error Handler Unit Tests
 */

const {
  AppError,
  errorHandler,
  asyncHandler,
} = require("../../utils/errorHandler");

describe("Error Handler", () => {
  describe("AppError", () => {
    test("should create an operational error with correct properties", () => {
      const error = new AppError("Test error message", 400);

      expect(error.message).toBe("Test error message");
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    test("should create a non-operational error when isOperational is false", () => {
      const error = new AppError("Programmer error", 500, false);

      expect(error.isOperational).toBe(false);
    });
  });

  describe("errorHandler middleware", () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        originalUrl: "/test",
        method: "GET",
        ip: "127.0.0.1",
        body: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    test("should handle operational errors in production mode", () => {
      process.env.NODE_ENV = "production";
      const error = new AppError("Test error", 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should default to 500 status code when not set", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("Unknown error");
      error.statusCode = undefined;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe("asyncHandler", () => {
    test("should wrap async functions and catch errors", async () => {
      const mockNext = jest.fn();

      const asyncFn = asyncHandler(async (req, res, next) => {
        throw new Error("Async error");
      });

      await asyncFn({}, {}, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    test("should pass result to next when successful", async () => {
      const mockNext = jest.fn();

      const asyncFn = asyncHandler(async (req, res, next) => {
        return { success: true };
      });

      const result = await asyncFn({}, {}, mockNext);

      expect(result).toEqual({ success: true });
    });
  });
});
