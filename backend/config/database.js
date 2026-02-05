const mongoose = require('mongoose');

const connectDB = async (retries = 5) => {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // free tier friendly
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed. Retries left: ${retries}`, error.message);

    if (retries === 0) {
      console.error('❌ MongoDB connection failed permanently');
      process.exit(1);
    }

    setTimeout(() => connectDB(retries - 1), 5000);
  }
};

module.exports = connectDB;
