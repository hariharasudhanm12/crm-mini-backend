// Shared helper functions for validation, regex, pagination, and schema transforms

// Transforms _id to id, removes __v, and formats populated references { _id, name } -> { id, name }
const addIdTransform = (schema) => {
  schema.set("toJSON", {
    transform: (doc, ret) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      delete ret._id;
      delete ret.__v;

      const refFields = ["assignedTo", "company", "lead"];
      for (const field of refFields) {
        if (ret[field] && typeof ret[field] === "object") {
          // If it's a raw unpopulated ObjectId, leave it as is or handle object conversion
          if (ret[field].constructor && ret[field].constructor.name === "ObjectId") {
            continue;
          }
          if (ret[field]._id) {
            ret[field] = {
              id: ret[field]._id.toString(),
              name: ret[field].name,
            };
          }
        }
      }

      return ret;
    },
  });
};

// Escapes special characters for safe regular expression matching
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// Extracts and normalizes page, limit, and skip values from query parameters
const getPagination = (query) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) {
    page = 1;
  }

  if (isNaN(limit) || limit < 1) {
    limit = 10;
  } else if (limit > 100) {
    limit = 100;
  }

  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// Validates standard email address format
const isValidEmail = (email) => {
  if (typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Validates HTTP and HTTPS URLs
const isValidUrl = (url) => {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
};

module.exports = {
  addIdTransform,
  escapeRegex,
  getPagination,
  isValidEmail,
  isValidUrl,
};
