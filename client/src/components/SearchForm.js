// Main component in the React app, handles search queries and paginated results

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
// import JsonArray from './JsonArray';
import JsonArray from './JsonArray_new.js';
import './styles/SearchForm.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Role from './Role';
import Clause from './Clause';
import Select from "react-select";
import { useLocation } from "react-router-dom";
import Contact from "./Contact";
import { Link } from 'react-router-dom';
// import Statistics from "./Statistics";

// Custom hook for parsing URL query parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SearchForm = () => {
   // State initialization for search form
  const urlParams = new URLSearchParams(window.location.search);
  const versionFromURL = urlParams.get('version');
  const [selectedVersion, setSelectedVersion] = useState(versionFromURL || 'synsemclass5.1');
  const urlQuery = useQuery();
  const [query, setQuery] = useState('');
  const [idRefQuery, setIdRefQuery] = useState('');
  const [classIDQuery, setclassIDQuery] = useState('');
  const [filters, setFilters] = useState([]);
  const [results, setResults] = useState([]);
  const [resultsClassesCount, setResultsClassesCount] = useState();
  const [langCounts, setLangCounts] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [roleOptions, setroleOptions] = useState([]);
  const [cmnoteQuery, setCmnoteQuery] = useState('');
  const [restrictQuery, setRestrictQuery] = useState('');

  const [restrictRolesSearch, setrestrictRolesSearch] = useState(false); // restrict the search only for the roles entered in the query

  const [diacriticsSensitive, setDiacriticsSensitive] = useState(false); // diacritics sensitive search for @lemma field

  const [role, setRole] = useState('');
  const [roles, setRoles] = useState([]);
  const [clauses, setClauses] = useState([]);

  const pageSize = 5; 
  const [currentPage, setCurrentPage] = useState(0);
  const [pagedResults, setPagedResults] = useState([]);
  const [pageCount, setPageCount] = useState(0); 

  const location = useLocation();

  const [classMembersCount, setClassMembersCount] = useState();
  const resultsTextRef = useRef(null);

  // Handles pagination of search results
  const handlePageChange = (selectedItem) => {
    setCurrentPage(selectedItem.selected);
    resultsTextRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  // Clears all input fields and resets the form
  const handleClearAll = () => {
    window.location.reload();
};
  
  // Fetches role options for the search form on component mount
  useEffect(() => {
    const fetchShortLabels = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/shortlabels`, {
          version: selectedVersion
        });
        setroleOptions(response.data);
      } catch (error) {
        console.error('Error fetching shortlabels:', error);
      }
    };

    fetchShortLabels();
  }, []);
  
  // Updates page count based on the number of results
  useEffect(() => {
    const calculatedPageCount = Math.ceil(results.length);
    setPageCount(calculatedPageCount);
  }, [results]);
  
  const getCNFclauses = () => {
    const nonEmptyClauses = clauses.filter(clause => clause.roles.length > 0);
    if (nonEmptyClauses.length > 0) {
      return nonEmptyClauses.map(clause => clause.roles);
    } else {
      // Handle the case where there are no non-empty clauses
      return [];
    }
  }

  // New function to get a readable query string
  const getReadableQuery = () => {
    return clauses.map((clause, ci) => {
      const rolesStr = clause.roles.join(' OR ');
      return `(${rolesStr})${ci !== clauses.length - 1 ? ' AND' : ''}`;
    }).join(' ');
  };
  

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
  
    async function fetchResultsFromUrl() {
      const params = {
        lemma: urlParams.get('lemma'),
        idRef: urlParams.get('idRef'),
        classID: urlParams.get('classID'),
        cmnote: urlParams.get('cmnote'),
        restrict: urlParams.get('restrict'),
        filters: urlParams.get('filters'),
        roles_cnf: urlParams.get('roles_cnf'),
        version: urlParams.get('version'),
        restrictRolesSearch: urlParams.get('restrictRolesSearch') === 'true',
        diacriticsSensitive: urlParams.get('diacriticsSensitive') === 'true'
      };
  
      // Check if any main search parameters are present
      if (!params.lemma && !params.idRef && !params.classID && !params.cmnote && !params.restrict && !params.roles_cnf) {
        return;
      }
  
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/search`, { params });
        setIsLoading(false);
        setResults(response.data.pages);
        setResultsClassesCount(response.data.uniqueCommonIdCount);
        setClassMembersCount(response.data.totalClassMembers);
        setLangCounts(response.data.langCounts);
        setShowNoResults(response.data.pages.length === 0);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  
    fetchResultsFromUrl();
  }, [location.search]); // Depend on location.search to trigger on URL change  
  
  // Handles form submission and fetches search results based on query parameters
  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsLoading(true);
    const cnf = getCNFclauses();

    const cnfString = JSON.stringify(cnf);

    // console.log(cnfString);

    if (!query && !idRefQuery && !classIDQuery && !cmnoteQuery && !restrictQuery && cnf.length===0) {
        console.log("Empty query.");
        setIsLoading(false);
        return;
    }
  
    const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/search`, {
      params: {
        lemma: query,
        idRef: idRefQuery,
        classID: classIDQuery,
        cmnote: cmnoteQuery,
        restrict: restrictQuery,
        filters: filters.join(","),
        roles_cnf: cnfString,
        version: selectedVersion,
        restrictRolesSearch: restrictRolesSearch,
        diacriticsSensitive: diacriticsSensitive
      },
    });

    // console.log('response.data', response.data.pages);
  
    setIsLoading(false);
    // setResults(response.data.results);
    setResults(response.data.pages);

    setResultsClassesCount(response.data.uniqueCommonIdCount);
    setClassMembersCount(response.data.totalClassMembers)

    setLangCounts(response.data.langCounts);
    setShowNoResults(response.data.pages.length === 0);

    // Reset the current page to 0 whenever a new search is made
    setCurrentPage(0);
  };
  
  // Helper function to compare arrays
  function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (Array.isArray(arr1[i]) && Array.isArray(arr2[i])) {
        if (!arraysEqual(arr1[i], arr2[i])) return false;
      } else if (arr1[i] !== arr2[i]) {
        return false;
      }
    }
    return true;
  }
  
  const handleFetchClassMembers = async (classID) => {
    try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/search`, {
            params: {
              lemma: '',
              idRef: '',
              classID: classID,
              cmnote: '',
              restrict: '',
              filters: [],
              roles_cnf: null,
              version: selectedVersion,
              restrictRolesSearch: false,
              diacriticsSensitive: false
            },
        });
        // Update the results state with the new data
        setQuery('');
        setIdRefQuery('');
        setclassIDQuery(classID);
        setCmnoteQuery('');
        setRestrictQuery('');
        setFilters([]);
        setIsLoading(false);
        setClauses([]);
        setrestrictRolesSearch(false);
        setDiacriticsSensitive(false);
      // setResults(response.data.results);
      setResults(response.data.pages);

      setResultsClassesCount(response.data.uniqueCommonIdCount);
      setClassMembersCount(response.data.totalClassMembers)

      setLangCounts(response.data.langCounts);
      setShowNoResults(response.data.pages.length === 0);


      // Reset the current page to 0 whenever a new search is made
      setCurrentPage(0);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

  const handleFillRolesInQuery = (roles) => {
    const newClauses = roles.map((role, index) => ({ 
      id: role + index, // Combining role and index to create a unique ID
      roles: [role] 
    }));
    setClauses(newClauses);

    setQuery('');
    setIdRefQuery('');
    setclassIDQuery('');
    setCmnoteQuery('');
    setRestrictQuery('');
  };


  // Event handler for input field changes
  const handleChange = (event) => {
    setQuery(event.target.value);
  };

  const handleIdRefChange = (event) => {
    setIdRefQuery(event.target.value);
  };

  const handleClassIDChange = (event) => {
    setclassIDQuery(event.target.value);
  };

  const handleCmnoteChange = (event) => {
    setCmnoteQuery(event.target.value);
  };

  const handleRestrictChange = (event) => {
    setRestrictQuery(event.target.value);
  };

  const handleFilterChange = (event) => {
    const isChecked = event.target.checked;
    const filterValue = event.target.value;

    if (isChecked) {
      setFilters([...filters, filterValue]);
    } else {
      setFilters(filters.filter((filter) => filter !== filterValue));
    }
  };

  const handleRoleChange = (selectedOption) => {
    const selectedRole = selectedOption?.value || null;
    setRole(selectedRole);
  
    // Add role to the pool if it doesn't exist already
    if (selectedRole && !roles.includes(selectedRole)) {
      setRoles((prevRoles) => [...prevRoles, selectedRole]);
  
      // If there are no clauses, add a new clause with the selected role
      if (clauses.length === 0) {
        setClauses([{ id: 0, roles: [selectedRole] }]);
        setRoles((prevRoles) => prevRoles.filter(role => role !== selectedRole));
      }
    }

    setRole('');
  };  

  const removeRole = (roleToRemove) => {
    setRoles(roles.filter((role) => role !== roleToRemove));
  };
  
  const addRoleToClause = (clauseId, roleToAdd) => {
    // create a deep copy of the clauses state
    const newClauses = JSON.parse(JSON.stringify(clauses));
  
    // loop over the copied clauses
    newClauses.forEach((clause) => {
      // if we found the clause where the role is to be added
      if (clause.id === clauseId) {
        // If the role is not already in the clause, add it.
        if (!clause.roles.includes(roleToAdd)) {
          clause.roles.push(roleToAdd);
        }
      }
    });
  
    // update the clauses state with the new copy
    setClauses(newClauses);
  
    // remove the role from the roles array
    removeRole(roleToAdd);
  };
  

  const removeRoleFromClause = (clauseId, roleToRemove) => {
    const updatedClauses = clauses.map((clause) =>
      clause.id === clauseId ? { ...clause, roles: clause.roles.filter((role) => role !== roleToRemove) } : clause
    );
  
    const filteredClauses = updatedClauses.filter((clause, index) => {
      // If it's the first clause, only keep it if it's not empty
      if (index === 0) {
        return clause.roles.length > 0;
      }
  
      // For other clauses, allow them to be empty
      return true;
    });
  
    setClauses(filteredClauses);
  };
  

  const addClause = () => {
    setClauses([...clauses, { id: clauses.length, roles: [] }]);
  };

  const removeClause = (clauseId) => {
    setClauses(clauses.filter((clause) => clause.id !== clauseId));
  };

  const selectOptions = roleOptions.map((option, index) => ({
    value: option,
    label: `${option}`,
  }));

  const languageMap = {
    eng: 'English',
    cz: 'Czech',
    deu: 'German',
    spa: 'Spanish'
  };

  const handleDownloadJson = async () => {
    try {
      const cnfClauses = getCNFclauses();
      const cnfString = cnfClauses.length > 0 ? JSON.stringify(cnfClauses) : '';

      const params = {
        lemma: query,
        idRef: idRefQuery,
        classID: classIDQuery,
        cmnote: cmnoteQuery,
        restrict: restrictQuery,
        filters: filters.join(","),
        roles_cnf: cnfString,
        version: selectedVersion,
        restrictRolesSearch: restrictRolesSearch,
        diacriticsSensitive: diacriticsSensitive,
        allResults: true
      };

      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/search`, { params });

      const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Constructing the file name
      let fileName = 'results';
      for (const [key, value] of Object.entries(params)) {
        if (value && key !== 'allResults') {
          const encodedValue = key === 'roles_cnf' && cnfString !== '' ? cnfString : encodeURIComponent(value);
          fileName += `&${key}=${encodedValue}`;
        }
      }

      // Replace the first '&' with '_'
      fileName = fileName.replace('&', '_');

      link.download = `${fileName}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading JSON:', error);
    }
  };

  // JSX rendering for the search form, including filters, inputs, and buttons
  return (
    <div>
    <div className='stats'>
    <a 
        href={`${process.env.REACT_APP_API_BASE_URL}/statistics?version=${selectedVersion}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className='stats-link'
    >
        Show Statistics
    </a>
</div>


    <div className="db-selection-container">
    <label className="db-selection-label">
        <input
          type="radio"
          value="synsemclass5.1"
          className="db-selection-radio"
          checked={selectedVersion === 'synsemclass5.1'}
          onChange={() => setSelectedVersion('synsemclass5.1')}
        />
        synsemclass5.1
      </label>
    <label className="db-selection-label">
        <input
          type="radio"
          value="synsemclass5.0"
          className="db-selection-radio"
          checked={selectedVersion === 'synsemclass5.0'}
          onChange={() => setSelectedVersion('synsemclass5.0')}
        />
        synsemclass5.0
      </label>
      <label className="db-selection-label">
        <input
          type="radio"
          value="synsemclass4.0"
          className="db-selection-radio"
          checked={selectedVersion === 'synsemclass4.0'}
          onChange={() => setSelectedVersion('synsemclass4.0')}
        />
        synsemclass4.0
      </label>
    </div>

      
      <div className="filters-container">
        <p>Filter languages</p>
        <label>
            <input type="checkbox" value="eng" onChange={handleFilterChange} />
            English
        </label>
        <label>
            <input type="checkbox" value="cz" onChange={handleFilterChange} />
            Czech
        </label>
        <label>
            <input type="checkbox" value="deu" onChange={handleFilterChange} />
            German
        </label>
        {selectedVersion !== 'synsemclass4.0' && (
          <label>
              <input type="checkbox" value="spa" onChange={handleFilterChange} />
              Spanish
          </label>
        )}
      </div>

      <div className="diacritics-container">
            <label>
              <input
                type="checkbox"
                checked={diacriticsSensitive}
                onChange={(e) => setDiacriticsSensitive(e.target.checked)}
              />
              Diacritics-Sensitive Search for lemma
            </label>
          </div>

        <form onSubmit={handleSubmit}>
        <div className="search-container">
          <div className="search-row">
          <label className="input-label" htmlFor="idRefInput">Lemma search:</label>
            <input
              type="text"
              className="search-input"
              placeholder="Lemma (e.g., bring)"
              value={query}
              onChange={handleChange}
            />
          </div>
      
          <div className="search-row idref-row">
            <label className="input-label" htmlFor="idRefInput">Sense ID search:</label>
            <input
              id="idRefInput"
              type="text"
              className="search-input idref-input"
              placeholder="ID (e.g., EngVallex-ID-ev-w122f2)"
              value={idRefQuery}
              onChange={handleIdRefChange}
            />
          </div>
          <div className="search-row class-id-row">
            <label className="input-label" htmlFor="ClassIDInput">Class ID search:</label>
            <input
              id="ClassIDInput"
              type="text"
              className="search-input class-id-input"
              placeholder="Class ID (e.g. vec00107)"
              autoComplete='off'
              value={classIDQuery}
              onChange={handleClassIDChange}
            />
          </div>

          <div className="search-row cmnote-row">
            <label className="input-label" htmlFor="CmnoteInput">CM Note search:</label>
            <input
              id="CmnoteInput"
              type="text"
              className="search-input cmnote-input"
              placeholder="CM Note (e.g. idiom.*)"
              autoComplete='off'
              value={cmnoteQuery}
              onChange={handleCmnoteChange}
            />
          </div>

          <div className="search-row restrict-row">
            <label className="input-label" htmlFor="RestrictInput">CM Restrict search:</label>
            <input
              id="RestrictInput"
              type="text"
              className="search-input restrict-input"
              placeholder="CM Restrict (e.g. to come across as)"
              autoComplete='off'
              value={restrictQuery}
              onChange={handleRestrictChange}
            />
          </div>

          <button type="submit" className="search-button">
              <i className="fa fa-search"></i>
              <span>Search</span>
            </button>    
        </div>


        <div>
        <div className='role-filter-container'>
          <p>Role(s) search:</p>
          <div className='roles-dropdown'>
            <div className='instructions'>
            <p>Construct roles query in Conjunctive Normal Form,</p>
            <p className='instructions example'>e.g., (Role1 OR Role2) AND (Role3 OR Role4) AND (Role5)</p>
            {/* <p className='desktop-view-description'>Select the role(s), drag and drop selected roles into the clauses brackets or between them.</p> */}
            <p className='description'>Select the role; if needed, select more roles within the clause (roles connected by OR), add more clauses (AND) and more roles within.</p>
            <p>If you want to search for results that have only the selected role(s), and no other roles, use the checkbox to restrict the search.</p>
            <p>Final query is displayed below highlighted in green.</p>
            </div>
            <div className="restrict-search-container">
            <label>
              <input
                type="checkbox"
                checked={restrictRolesSearch}
                onChange={(e) => setrestrictRolesSearch(e.target.checked)}
              />
              Restrict search only to these roles
            </label>
          </div>
            {clauses.length === 0 && (
              <Select
                className="role-select"
                value={selectOptions.find((option) => option.value === role) || ''}
                options={selectOptions}
                onChange={handleRoleChange}
                placeholder="Select a role"
              />
            )}

            {clauses.length > 0 && (
                <button type="button" onClick={addClause}>
                  Add AND operator
                </button>
              )}
          </div>
        </div>

        {clauses.length > 0 && (
        <div className='clauses-container'>
          <div className='query-constructor-header'>
            <p className='query-constructor'>Query Constructor</p>
            <button 
                type="button" 
                className="clear-roles-query" 
                onClick={() => setClauses([])}
            >
                Clear query
            </button>
        </div>
          <div className='clause'>
                {clauses.map((clause, index) => {
                const isLastClause = index === clauses.length - 1;

                return (
                  <Clause
                  key={clause.uniqueId}
                  id={clause.id}
                  roles={clause.roles}
                  onAddRole={addRoleToClause}
                  onRemoveRole={removeRoleFromClause}
                  removeClause={() => removeClause(clause.id)}
                  isLastClause={isLastClause}
                  selectOptions={selectOptions}
                />
              );
            })}
          </div>
        </div>
      )}


      </div>

    {/*Showing Final Query below*/}
    
    {clauses.length > 0 && (
    <div className="final-query-view">
      <div className="content-wrapper">
        <p className="final-query">{getReadableQuery()}</p>
      </div>
    </div>
    )}



    <div className="button-container">
      <button type="button" className="clear-button" onClick={handleClearAll}>
        Clear All
      </button>
    </div>

        </form>
    
        {showNoResults && <div>No results found.</div>}
    
        {!isLoading && classMembersCount > 0 && (
          <div>
            <h4 ref={resultsTextRef} className='resultsText'>Found {classMembersCount} class member(s) in {resultsClassesCount} unique class(es).</h4>

            <ul className="langCounts">
                {Object.keys(langCounts).map(language => (
                    <li key={language}>
                        {langCounts[language].classMembers} {languageMap[language]} class member(s) in {langCounts[language].commonClasses} class(es)
                    </li>
                ))}
            </ul>
            
            <div className='download-button-container'>
              <button className='download-button' onClick={handleDownloadJson}>
                Download JSON
              </button>
            </div>

            {/* {console.log("CLIENT SIDE RESULTS:", results)}
            {console.log("RES LEN", results.length)} */}

            {results.length > 1 && (
        <ReactPaginate
          previousLabel={"previous"}
          nextLabel={"next"}
          breakLabel={"..."}
          pageCount={pageCount}
          marginPagesDisplayed={2}
          pageRangeDisplayed={5}
          onPageChange={handlePageChange}
          containerClassName={"pagination"}
          pageClassName={"page"}
          activeClassName={"active"}
          previousClassName={"previous"}
          nextClassName={"next"}
          pageLinkClassName={"page-link"}
          previousLinkClassName={"previous-link"}
          nextLinkClassName={"next-link"}
          forcePage={currentPage}
        />
      )}
      <JsonArray 
        data={results[currentPage]} 
        currentPage={currentPage} 
        onFetchClassMembers={handleFetchClassMembers}
        onFillRolesInQuery={handleFillRolesInQuery}
        version={selectedVersion}
      />


      {results.length > 1 && (
        <ReactPaginate
          previousLabel={"previous"}
          nextLabel={"next"}
          breakLabel={"..."}
          pageCount={pageCount}
          marginPagesDisplayed={2}
          pageRangeDisplayed={5}
          onPageChange={handlePageChange}
          containerClassName={"pagination"}
          pageClassName={"page"}
          activeClassName={"active"}
          previousClassName={"previous"}
          nextClassName={"next"}
          pageLinkClassName={"page-link"}
          previousLinkClassName={"previous-link"}
          nextLinkClassName={"next-link"}
          forcePage={currentPage}
        />
      )}
          </div>
        )}


    
        {isLoading && <div>Loading...</div>}
        </div>
    );
    };

export default SearchForm;
