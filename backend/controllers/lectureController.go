package controllers

import (
	"net/http"
	"strconv"
	"time"
	"tms-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// CreateLectureRequest defines the shape of the incoming JSON from the frontend.
type CreateLectureRequest struct {
	DayOfWeek int    `json:"DayOfWeek"`
	StartTime string `json:"StartTime"`
	EndTime   string `json:"EndTime"`
	SubjectID uint   `json:"SubjectID"`
	FacultyID uint   `json:"FacultyID"`
	Room      string `json:"Room"`
	BatchID   uint   `json:"BatchID"`
	SectionID uint   `json:"SectionID"`
	CourseID  uint   `json:"CourseID"`
	Semester  int    `json:"Semester"`
}

// CreateLecture handles the complex logic of finding/creating related records before creating a lecture.
func CreateLecture(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateLectureRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
			return
		}

		userValue, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context. Authorization is required."})
			return
		}

		user, ok := userValue.(models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process user information from context."})
			return
		}

		// --- 1. Find or Create the Timetable ---
		timetable := models.Timetable{
			BatchID:   req.BatchID,
			SectionID: &req.SectionID,
			CourseID:  req.CourseID,
			Semester:  req.Semester,
			RoomID:    1,
			CreatedBy: user.ID,
		}
		if err := db.Where(models.Timetable{BatchID: req.BatchID, SectionID: &req.SectionID, Semester: req.Semester}).
			Attrs(models.Timetable{CreatedBy: user.ID, RoomID: 1}).
			FirstOrCreate(&timetable).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find or create timetable: " + err.Error()})
			return
		}

		// --- 2. Find or Create the Timeslot with Overlap Check ---
		startTime, err1 := time.Parse("15:04", req.StartTime)
		endTime, err2 := time.Parse("15:04", req.EndTime)
		if err1 != nil || err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time format. Use HH:MM."})
			return
		}

		var existingTimeslot models.Timeslot
		err := db.Where("day_of_week = ? AND CAST(start_time AS TIME) < ? AND CAST(end_time AS TIME) > ?",
			req.DayOfWeek,
			endTime.Format("15:04:05"),
			startTime.Format("15:04:05"),
		).First(&existingTimeslot).Error

		// ✨ FIX: This block now correctly handles the self-finding issue.
		if err == nil { // A potential overlap was found.
			// Check if the found slot is the *exact same* as the one we want to create.
			// We compare the parsed time objects for accuracy.
			if existingTimeslot.StartTime.Equal(startTime) && existingTimeslot.EndTime.Equal(endTime) {
				// This is not a conflict. It's the same slot. We can proceed.
			} else {
				// This is a true conflict with a different, overlapping slot.
				c.JSON(http.StatusConflict, gin.H{
					"error":   "Time slot conflict.",
					"message": "The requested time slot overlaps with a different existing one.",
				})
				return
			}
		} else if err != gorm.ErrRecordNotFound { // A real database error occurred.
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking for timeslot conflicts."})
			return
		}

		// If we reach here, it's safe to find or create the timeslot.
		timeslot := models.Timeslot{
			DayOfWeek: req.DayOfWeek,
			StartTime: startTime,
			EndTime:   endTime,
		}
		if err = db.Where(models.Timeslot{DayOfWeek: req.DayOfWeek, StartTime: startTime, EndTime: endTime}).
			FirstOrCreate(&timeslot).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find or create timeslot: " + err.Error()})
			return
		}

		// --- 3. Create or Update the Lecture ---
		lecture := models.Lecture{
			TimetableID: timetable.ID,
			TimeslotID:  timeslot.ID,
			SubjectID:   req.SubjectID,
			FacultyID:   req.FacultyID,
			Room:        req.Room,
		}

		if err = db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "timetable_id"}, {Name: "timeslot_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"subject_id", "faculty_id", "room"}),
		}).Create(&lecture).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create or update lecture: " + err.Error()})
			return
		}

		c.JSON(http.StatusCreated, lecture)
	}
}

// ... QueryLectures and DeleteLecture functions remain the same ...
func QueryLectures(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// --- Parameter Extraction ---
		courseIDStr := c.Query("course_id")
		yearStr := c.Query("year") // Maps to Batch's EntryYear
		sectionName := c.Query("section")
		semesterStr := c.Query("semester")
		facultyIDStr := c.Query("faculty_id")
		roomIDStr := c.Query("room_id")

		// --- Base Query Construction ---
		// Start with the Lecture model and preload all necessary associations for a rich response.
		query := db.Model(&models.Lecture{}).
			Preload("Subject").
			Preload("Faculty.User"). // Also fetch user details for the faculty
			Preload("Timeslot").
			Preload("Timetable.Course").
			Preload("Timetable.Batch").
			Preload("Timetable.Section").
			Preload("Timetable.Room")

		// Join with Timetables, as it's central to most filters.
		query = query.Joins("JOIN timetables ON timetables.id = lectures.timetable_id")

		// --- Apply Optional Filters ---

		if semesterStr != "" {
			if semester, err := strconv.Atoi(semesterStr); err == nil {
				query = query.Where("timetables.semester = ?", semester)
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'semester' parameter"})
				return
			}
		}

		if facultyIDStr != "" {
			if facultyID, err := strconv.Atoi(facultyIDStr); err == nil {
				query = query.Where("lectures.faculty_id = ?", facultyID)
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'faculty_id' parameter"})
				return
			}
		}

		if roomIDStr != "" {
			if roomID, err := strconv.Atoi(roomIDStr); err == nil {
				query = query.Where("timetables.room_id = ?", roomID)
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'room_id' parameter"})
				return
			}
		}

		// For filters related to Batch (year, course), we need to join the batches table.
		if yearStr != "" || courseIDStr != "" {
			query = query.Joins("JOIN batches ON batches.id = timetables.batch_id")

			if yearStr != "" {
				if year, err := strconv.Atoi(yearStr); err == nil {
					query = query.Where("batches.entry_year = ?", year)
				} else {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'year' parameter"})
					return
				}
			}

			if courseIDStr != "" {
				if courseID, err := strconv.Atoi(courseIDStr); err == nil {
					query = query.Where("batches.course_id = ?", courseID)
				} else {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'course_id' parameter"})
					return
				}
			}
		}

		// For the section filter, we join the sections table.
		if sectionName != "" {
			// This filter will only work for timetables assigned to a specific section.
			query = query.Joins("JOIN sections ON sections.id = timetables.section_id").
				Where("sections.name = ?", sectionName)
		}

		// --- Execute Query ---
		var lectures []models.Lecture
		if err := query.Find(&lectures).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query lectures: " + err.Error()})
			return
		}

		if len(lectures) == 0 {
			c.JSON(http.StatusOK, []models.Lecture{}) // Return empty array instead of object
			return
		}

		c.JSON(http.StatusOK, lectures)
	}
}


// DeleteLectureRequest defines the body for a lecture deletion request.
type DeleteLectureRequest struct {
	TimetableID uint `json:"timetable_id" binding:"required"`
	TimeslotID  uint `json:"timeslot_id" binding:"required"`
}

// DeleteLecture handles the deletion of a specific lecture entry. (Remains unchanged)
func DeleteLecture(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req DeleteLectureRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
			return
		}

		result := db.Where("timetable_id = ? AND timeslot_id = ?", req.TimetableID, req.TimeslotID).Delete(&models.Lecture{})

		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete lecture: " + result.Error.Error()})
			return
		}

		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"message": "Lecture not found or already deleted."})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Lecture deleted successfully"})
	}
}
