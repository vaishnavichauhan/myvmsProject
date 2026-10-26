const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const apiV1Router = require('./routes/index');
const authRoutes = require('./routes/auth.routes');
const societyRoutes = require('./routes/society.routes');
const homeRoutes = require('./routes/home.routes');
const residentRoutes = require('./routes/resident.routes');
const familyMemberRoutes = require('./routes/family-member.routes');
const workerRoutes = require('./routes/worker.routes');
const permissionRoutes = require('./routes/permission.routes');
const securityRoutes = require('./routes/security.routes');
const gateRoutes = require('./routes/gate.routes');
const visitorRoutes = require('./routes/visitor.routes');
const courierDeliveryRoutes = require('./routes/courier-delivery.routes');
const committeeRoutes = require('./routes/committee.routes');
const announcementRoutes = require('./routes/announcement.routes');
const adminRoutes = require('./routes/admin.routes');
const reportRoutes = require('./routes/report.routes');
const healthRoutes = require('./routes/health.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const specialChargeRoutes = require('./routes/special-charge.routes');
const pollRoutes = require('./routes/poll.routes');
const amenityRoutes = require('./routes/amenity.routes');
const superAdminRoutes = require('./routes/superadmin.routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.nodeEnv !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Root ping
app.get('/', (req, res) => {
  res.json({
    project: 'MYVMS - Residential Society Management System',
    status: 'online',
    apiDocumentation: '/api/v1',
  });
});

// Direct top-level /api routes matching exact specification
app.use('/api/auth', authRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/homes', homeRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/family-members', familyMemberRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/gates', gateRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/courier-deliveries', courierDeliveryRoutes);
app.use('/api/deliveries', courierDeliveryRoutes);
app.use('/api/committee', committeeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/special-charges', specialChargeRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Versioned /api/v1 routes
app.use('/api/v1', apiV1Router);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
