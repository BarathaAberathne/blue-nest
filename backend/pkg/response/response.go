package response

import (
	"encoding/json"
	"net/http"
)

type Envelope struct {
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func OK(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, Envelope{Data: data})
}

func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, Envelope{Data: data})
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func BadRequest(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusBadRequest, Envelope{Error: msg})
}

func Unauthorized(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusUnauthorized, Envelope{Error: msg})
}

func Forbidden(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusForbidden, Envelope{Error: msg})
}

func TooManyRequests(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusTooManyRequests, Envelope{Error: msg})
}

func NotFound(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusNotFound, Envelope{Error: msg})
}

func InternalError(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusInternalServerError, Envelope{Error: msg})
}
