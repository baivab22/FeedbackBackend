const CollegeForm = require('../models/collegeForm.model');
const asyncHandler = require('express-async-handler');

// @desc    Create new college form
// @route   POST /api/college-forms
// @access  Public
const createCollegeForm = asyncHandler(async (req, res) => {
  try {
    const formData = req.body;
    
    // Validate required fields
    const requiredFields = ['collegeName', 'campusType', 'establishmentDate'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if college already has a form
    const existingForm = await CollegeForm.findOne({ 
      collegeName: formData.collegeName,
      'location.district': formData.location?.district
    });

    if (existingForm) {
      return res.status(400).json({
        success: false,
        message: 'A form for this college already exists'
      });
    }

    // Process buildings media if provided
    if (formData.infrastructure?.buildings) {
      formData.infrastructure.buildings = formData.infrastructure.buildings.map(building => {
        if (!building.media) {
          building.media = { images: [], videos: [] };
        }
        return building;
      });
    }

    const collegeForm = new CollegeForm({
      ...formData,
      formStatus: 'Draft'
    });

    const createdForm = await collegeForm.save();
    
    res.status(201).json({
      success: true,
      data: createdForm,
      message: 'College form created successfully'
    });
  } catch (error) {
    console.error('Create college form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating college form',
      error: error.message
    });
  }
});

// @desc    Get all college forms with filtering and pagination
// @route   GET /api/college-forms
// @access  Public
const getCollegeForms = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      district,
      province,
      campusType,
      formStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeMedia = false
    } = req.query;

    // Build query object
    const query = {};

    if (district) query['location.district'] = new RegExp(district, 'i');
    if (province) query['location.province'] = new RegExp(province, 'i');
    if (campusType) query.campusType = campusType;
    if (formStatus) query.formStatus = formStatus;
    
    if (search) {
      query.$or = [
        { collegeName: new RegExp(search, 'i') },
        { 'principalInfo.name': new RegExp(search, 'i') },
        { 'location.district': new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Build select statement
    let selectFields = 'collegeName campusType location principalInfo formStatus createdAt updatedAt';
    if (includeMedia === 'true') {
      selectFields += ' infrastructure.buildings';
    }

    // Execute query with pagination
    const forms = await CollegeForm.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select(selectFields);

    const total = await CollegeForm.countDocuments(query);

    // Add media count if requested
    let responseData = forms;
    if (includeMedia === 'true') {
      responseData = forms.map(form => {
        const formObj = form.toObject();
        if (formObj.infrastructure?.buildings) {
          formObj.buildingMediaSummary = formObj.infrastructure.buildings.map(building => ({
            buildingName: building.buildingName,
            imageCount: building.media?.images?.length || 0,
            videoCount: building.media?.videos?.length || 0
          }));
        }
        return formObj;
      });
    }

    res.json({
      success: true,
      data: responseData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalForms: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get college forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching college forms',
      error: error.message
    });
  }
});

// @desc    Get single college form by ID
// @route   GET /api/college-forms/:id
// @access  Public
const getCollegeForm = asyncHandler(async (req, res) => {
  try {
    const { includeMediaStats = false } = req.query;
    
    const form = await CollegeForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'College form not found'
      });
    }

    let responseData = form.toObject();

    // Add media statistics if requested
    if (includeMediaStats === 'true' && responseData.infrastructure?.buildings) {
      responseData.mediaStatistics = {
        totalBuildings: responseData.infrastructure.buildings.length,
        buildingsWithMedia: responseData.infrastructure.buildings.filter(
          b => (b.media?.images?.length > 0 || b.media?.videos?.length > 0)
        ).length,
        totalImages: responseData.infrastructure.buildings.reduce(
          (sum, b) => sum + (b.media?.images?.length || 0), 0
        ),
        totalVideos: responseData.infrastructure.buildings.reduce(
          (sum, b) => sum + (b.media?.videos?.length || 0), 0
        ),
        buildingBreakdown: responseData.infrastructure.buildings.map((building, index) => ({
          index,
          buildingName: building.buildingName,
          imageCount: building.media?.images?.length || 0,
          videoCount: building.media?.videos?.length || 0
        }))
      };
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get college form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching college form',
      error: error.message
    });
  }
});

// @desc    Update college form
// @route   PUT /api/college-forms/:id
// @access  Public
const updateCollegeForm = asyncHandler(async (req, res) => {
  try {
    const form = await CollegeForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'College form not found'
      });
    }

    // Prevent updating certain fields
    const updateData = { ...req.body };
    delete updateData.submissionDate;
    
    // Handle building media updates
    if (updateData.infrastructure?.buildings) {
      updateData.infrastructure.buildings = updateData.infrastructure.buildings.map(building => {
        // Initialize media if not present
        if (!building.media) {
          building.media = { images: [], videos: [] };
        }
        
        // Validate media items
        if (building.media.images) {
          building.media.images = building.media.images.map(img => ({
            url: img.url,
            caption: img.caption || '',
            uploadDate: img.uploadDate || Date.now(),
            fileSize: img.fileSize || null,
            mimeType: img.mimeType || null
          }));
        }
        
        if (building.media.videos) {
          building.media.videos = building.media.videos.map(vid => ({
            url: vid.url,
            caption: vid.caption || '',
            uploadDate: vid.uploadDate || Date.now(),
            fileSize: vid.fileSize || null,
            duration: vid.duration || null,
            mimeType: vid.mimeType || null,
            thumbnail: vid.thumbnail || null
          }));
        }
        
        return building;
      });
    }
    
    updateData.lastModified = Date.now();

    const updatedForm = await CollegeForm.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    res.json({
      success: true,
      data: updatedForm,
      message: 'College form updated successfully'
    });
  } catch (error) {
    console.error('Update college form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating college form',
      error: error.message
    });
  }
});

// @desc    Partial update college form (for specific sections like adding media)
// @route   PATCH /api/college-forms/:id
// @access  Public
const partialUpdateCollegeForm = asyncHandler(async (req, res) => {
  try {
    const form = await CollegeForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'College form not found'
      });
    }

    const { 
      action, 
      buildingIndex, 
      mediaType, 
      mediaData, 
      mediaIndex 
    } = req.body;

    // Handle building media operations
    if (action === 'addBuildingMedia') {
      if (buildingIndex === undefined || !mediaType || !mediaData) {
        return res.status(400).json({
          success: false,
          message: 'buildingIndex, mediaType, and mediaData are required'
        });
      }

      if (!['image', 'video'].includes(mediaType)) {
        return res.status(400).json({
          success: false,
          message: 'mediaType must be either "image" or "video"'
        });
      }

      if (!form.infrastructure?.buildings?.[buildingIndex]) {
        return res.status(404).json({
          success: false,
          message: 'Building not found at specified index'
        });
      }

      // Initialize media if needed
      if (!form.infrastructure.buildings[buildingIndex].media) {
        form.infrastructure.buildings[buildingIndex].media = { images: [], videos: [] };
      }

      const newMedia = {
        url: mediaData.url,
        caption: mediaData.caption || '',
        uploadDate: Date.now(),
        fileSize: mediaData.fileSize || null,
        mimeType: mediaData.mimeType || null
      };

      if (mediaType === 'video') {
        newMedia.duration = mediaData.duration || null;
        newMedia.thumbnail = mediaData.thumbnail || null;
      }

      const targetArray = mediaType === 'image' ? 'images' : 'videos';
      form.infrastructure.buildings[buildingIndex].media[targetArray].push(newMedia);

    } else if (action === 'deleteBuildingMedia') {
      if (buildingIndex === undefined || !mediaType || mediaIndex === undefined) {
        return res.status(400).json({
          success: false,
          message: 'buildingIndex, mediaType, and mediaIndex are required'
        });
      }

      if (!['images', 'videos'].includes(mediaType)) {
        return res.status(400).json({
          success: false,
          message: 'mediaType must be either "images" or "videos"'
        });
      }

      if (!form.infrastructure?.buildings?.[buildingIndex]?.media?.[mediaType]?.[mediaIndex]) {
        return res.status(404).json({
          success: false,
          message: 'Media not found at specified location'
        });
      }

      form.infrastructure.buildings[buildingIndex].media[mediaType].splice(mediaIndex, 1);

    } else if (action === 'updateMediaCaption') {
      if (buildingIndex === undefined || !mediaType || mediaIndex === undefined || !mediaData?.caption) {
        return res.status(400).json({
          success: false,
          message: 'buildingIndex, mediaType, mediaIndex, and caption are required'
        });
      }

      if (!['images', 'videos'].includes(mediaType)) {
        return res.status(400).json({
          success: false,
          message: 'mediaType must be either "images" or "videos"'
        });
      }

      if (!form.infrastructure?.buildings?.[buildingIndex]?.media?.[mediaType]?.[mediaIndex]) {
        return res.status(404).json({
          success: false,
          message: 'Media not found at specified location'
        });
      }

      form.infrastructure.buildings[buildingIndex].media[mediaType][mediaIndex].caption = mediaData.caption;

    } else {
      // Regular partial update (for other fields)
      const updateData = { ...req.body };
      delete updateData.submissionDate;
      delete updateData.action;

      Object.keys(updateData).forEach(key => {
        form[key] = updateData[key];
      });
    }

    form.lastModified = Date.now();
    await form.save();

    res.json({
      success: true,
      data: form,
      message: action ? `${action} completed successfully` : 'College form updated successfully'
    });
  } catch (error) {
    console.error('Partial update college form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating college form',
      error: error.message
    });
  }
});

// @desc    Submit college form for review
// @route   POST /api/college-forms/:id/submit
// @access  Public
const submitCollegeForm = asyncHandler(async (req, res) => {
  try {
    const form = await CollegeForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'College form not found'
      });
    }

    if (form.formStatus === 'Submitted') {
      return res.status(400).json({
        success: false,
        message: 'Form is already submitted'
      });
    }

    // Validate required fields before submission
    const requiredFields = [
      'collegeName',
      'campusType', 
      'establishmentDate',
      'location.province',
      'location.district',
      'location.localLevel',
      'location.wardNo',
      'principalInfo.name',
      'academicPrograms.totalFaculties',
      'academicPrograms.enrollment.total'
    ];

    const missingFields = [];
    requiredFields.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj && obj[key], form);
      if (!value) missingFields.push(field);
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit form. Missing required fields: ${missingFields.join(', ')}`
      });
    }

    form.formStatus = 'Submitted';
    form.submissionDate = Date.now();
    form.lastModified = Date.now();
    
    const submittedForm = await form.save();

    res.json({
      success: true,
      data: submittedForm,
      message: 'College form submitted successfully for review'
    });
  } catch (error) {
    console.error('Submit college form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting college form',
      error: error.message
    });
  }
});

// @desc    Update form status
// @route   PATCH /api/college-forms/:id/status
// @access  Public
const updateFormStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Under Review', 'Approved', 'Rejected', 'Draft', 'Submitted'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const form = await CollegeForm.findByIdAndUpdate(
      req.params.id,
      { 
        formStatus: status,
        lastModified: Date.now()
      },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'College form not found'
      });
    }

    res.json({
      success: true,
      data: form,
      message: `Form status updated to ${status}`
    });
  } catch (error) {
    console.error('Update form status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating form status',
      error: error.message
    });
  }
});

// @desc    Delete college form
// @route   DELETE /api/college-forms/:id
// @access  Public
const deleteCollegeForm = asyncHandler(async (req, res) => {
  try {
    const form = await CollegeForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'College form not found'
      });
    }

    await CollegeForm.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'College form deleted successfully'
    });
  } catch (error) {
    console.error('Delete college form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting college form',
      error: error.message
    });
  }
});

// @desc    Get college statistics and overview
// @route   GET /api/college-forms/stats/overview
// @access  Public
const getCollegeStats = asyncHandler(async (req, res) => {
  try {
    const stats = await CollegeForm.aggregate([
      {
        $facet: {
          totalColleges: [{ $count: 'count' }],
          byCampusType: [
            { $group: { _id: '$campusType', count: { $sum: 1 } } }
          ],
          byProvince: [
            { $group: { _id: '$location.province', count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: '$formStatus', count: { $sum: 1 } } }
          ],
          totalStudents: [
            { $group: { _id: null, total: { $sum: '$academicPrograms.enrollment.total' } } }
          ],
          recentSubmissions: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { 
              $project: { 
                collegeName: 1, 
                campusType: 1, 
                'location.district': 1, 
                formStatus: 1,
                createdAt: 1 
              } 
            }
          ],
          mediaStats: [
            {
              $project: {
                collegeName: 1,
                totalBuildings: { $size: { $ifNull: ['$infrastructure.buildings', []] } },
                totalImages: {
                  $sum: {
                    $map: {
                      input: { $ifNull: ['$infrastructure.buildings', []] },
                      as: 'building',
                      in: { $size: { $ifNull: ['$$building.media.images', []] } }
                    }
                  }
                },
                totalVideos: {
                  $sum: {
                    $map: {
                      input: { $ifNull: ['$infrastructure.buildings', []] },
                      as: 'building',
                      in: { $size: { $ifNull: ['$$building.media.videos', []] } }
                    }
                  }
                }
              }
            },
            {
              $group: {
                _id: null,
                totalBuildings: { $sum: '$totalBuildings' },
                totalImages: { $sum: '$totalImages' },
                totalVideos: { $sum: '$totalVideos' }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];
    
    res.json({
      success: true,
      data: {
        totalColleges: result.totalColleges[0]?.count || 0,
        byCampusType: result.byCampusType,
        byProvince: result.byProvince,
        byStatus: result.byStatus,
        totalStudents: result.totalStudents[0]?.total || 0,
        recentSubmissions: result.recentSubmissions,
        mediaStatistics: result.mediaStats[0] || {
          totalBuildings: 0,
          totalImages: 0,
          totalVideos: 0
        }
      }
    });
  } catch (error) {
    console.error('Get college stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching college statistics',
      error: error.message
    });
  }
});

// @desc    Search colleges by name, district, or principal
// @route   GET /api/college-forms/search
// @access  Public
const searchColleges = asyncHandler(async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const colleges = await CollegeForm.find({
      $or: [
        { collegeName: new RegExp(q.trim(), 'i') },
        { 'location.district': new RegExp(q.trim(), 'i') },
        { 'location.province': new RegExp(q.trim(), 'i') },
        { 'principalInfo.name': new RegExp(q.trim(), 'i') }
      ]
    })
    .select('collegeName campusType location principalInfo formStatus academicPrograms.enrollment.total')
    .limit(parseInt(limit))
    .sort({ collegeName: 1 });

    res.json({
      success: true,
      data: colleges,
      total: colleges.length
    });
  } catch (error) {
    console.error('Search colleges error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching colleges',
      error: error.message
    });
  }
});

// @desc    Get colleges by district
// @route   GET /api/college-forms/district/:district
// @access  Public
const getCollegesByDistrict = asyncHandler(async (req, res) => {
  try {
    const { district } = req.params;
    const { campusType, status } = req.query;

    const query = { 'location.district': new RegExp(district, 'i') };
    
    if (campusType) query.campusType = campusType;
    if (status) query.formStatus = status;

    const colleges = await CollegeForm.find(query)
      .select('collegeName campusType location principalInfo contactInfo formStatus academicPrograms.enrollment.total academicPrograms.programs')
      .sort({ collegeName: 1 });

    res.json({
      success: true,
      data: colleges,
      total: colleges.length,
      district: district
    });
  } catch (error) {
    console.error('Get colleges by district error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching colleges by district',
      error: error.message
    });
  }
});

// @desc    Bulk update form status
// @route   PATCH /api/college-forms/bulk/status
// @access  Public
const bulkUpdateStatus = asyncHandler(async (req, res) => {
  try {
    const { formIds, status } = req.body;

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0 || !status) {
      return res.status(400).json({
        success: false,
        message: 'Form IDs array and status are required'
      });
    }

    const allowedStatuses = ['Under Review', 'Approved', 'Rejected', 'Draft', 'Submitted'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const result = await CollegeForm.updateMany(
      { _id: { $in: formIds } },
      { 
        $set: { 
          formStatus: status, 
          lastModified: Date.now() 
        } 
      }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} forms to ${status}`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk status update',
      error: error.message
    });
  }
});

// @desc    Get colleges by province
// @route   GET /api/college-forms/province/:province
// @access  Public
const getCollegesByProvince = asyncHandler(async (req, res) => {
  try {
    const { province } = req.params;
    const { campusType } = req.query;

    const query = { 'location.province': new RegExp(province, 'i') };
    if (campusType) query.campusType = campusType;

    const colleges = await CollegeForm.find(query)
      .select('collegeName campusType location.district location.localLevel principalInfo.name formStatus academicPrograms.enrollment.total')
      .sort({ 'location.district': 1, collegeName: 1 });

    // Group by district for better organization
    const collegesByDistrict = colleges.reduce((acc, college) => {
      const district = college.location.district;
      if (!acc[district]) {
        acc[district] = [];
      }
      acc[district].push(college);
      return acc;
    }, {});

    res.json({
      success: true,
      data: collegesByDistrict,
      total: colleges.length,
      province: province
    });
  } catch (error) {
    console.error('Get colleges by province error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching colleges by province',
      error: error.message
    });
  }
});

// @desc    Get all forms (simplified version without user filtering)
// @route   GET /api/college-forms/my-forms
// @access  Public
const getMyCollegeForms = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) query.formStatus = status;

    const forms = await CollegeForm.find(query)
      .select('collegeName campusType location formStatus createdAt submissionDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CollegeForm.countDocuments(query);

    res.json({
      success: true,
      data: forms,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalForms: total
      }
    });
  } catch (error) {
    console.error('Get my college forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching college forms',
      error: error.message
    });
  }
});

module.exports = {
  createCollegeForm,
  getCollegeForms,
  getCollegeForm,
  updateCollegeForm,
  partialUpdateCollegeForm,
  submitCollegeForm,
  updateFormStatus,
  deleteCollegeForm,
  getCollegeStats,
  searchColleges,
  getCollegesByDistrict,
  getCollegesByProvince,
  bulkUpdateStatus,
  getMyCollegeForms
};