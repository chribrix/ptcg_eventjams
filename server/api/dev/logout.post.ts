export default defineEventHandler(async (event) => {
  // Only allow this endpoint in development
  if (process.env.NODE_ENV === "production") {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found",
    });
  }

  if (event.node.req.method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    // Clear the dev cookies by setting them to expire
    setCookie(event, "dev-user-id", "", {
      httpOnly: true,
      secure: false,
      maxAge: 0, // Expire immediately
      sameSite: "lax",
    });

    setCookie(event, "dev-user-email", "", {
      httpOnly: true,
      secure: false,
      maxAge: 0, // Expire immediately
      sameSite: "lax",
    });

    return {
      success: true,
      message: "Logged out successfully",
    };
  } catch (error) {
    console.error("Dev logout error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
