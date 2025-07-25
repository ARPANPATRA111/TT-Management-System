package middleware

import (
	"net/http"
	"slices"
	"tms-server/config"
	"tms-server/models"
	"tms-server/utils"

	"github.com/gin-gonic/gin"
)

func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("auth_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token not found"})
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		var user models.User
		if err := config.DB.Where("email = ?", claims.Email).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User associated with token not found"})
			c.Abort()
			return
		}
		c.Set("user", user)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func RoleAuthMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
			c.Abort()
			return
		}

		roleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid role format"})
			c.Abort()
			return
		}

		if !slices.Contains(allowedRoles, roleStr) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions for this action"})
			c.Abort()
			return
		}

		c.Next()
	}
}
