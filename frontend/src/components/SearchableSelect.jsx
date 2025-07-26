import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const SearchableSelect = ({
  options,
  onSelect,
  placeholder,
  value,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        const selectedOption = options.find((o) => o.value === value);
        setSearchTerm(selectedOption ? selectedOption.label : "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, value, options]);

  useEffect(() => {
    const selectedOption = options.find((o) => o.value === value);
    setSearchTerm(selectedOption ? selectedOption.label : "");
  }, [value, options]);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="pl-4 pr-8 py-2 text-gray-900 border border-gray-300 rounded-md hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-500 focus:ring-1 transition-colors bg-white shadow-sm w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  setSearchTerm(option.label);
                  setIsOpen(false);
                }}
                className="px-4 py-2 cursor-pointer hover:bg-slate-100"
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">No options found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
