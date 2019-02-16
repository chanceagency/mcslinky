var glob = require('glob'),
    fs = require('fs'),
    colors = require('colors/safe');

var defaultDir = '../Assets/Ink Files/';

// Run just against GDC rides
var filesToLint = defaultDir + 'GDCDemo/Rides/*.ink';

var sendOutputToStream = false;
var collectedOutput;
// OR, run against all Rides
// var filesToLint = defaultDir + '{,GDCDemo/}' + "Rides/{**,!(NotInUse)/}*.ink"

/* RUN LINTING TESTS */
/* Run the command `ava linter-test.js` within the test directory

/* TODO:
Implement:
1. react tag with an emote arg, and vice versa - invalid: >>react:happy >>emote:squint
2. discuss the new, skipped test with Andrew. Is it worth trying to handle ink tags with colons, or are we just
   reimplementing the Inky tag-parser.
3. (Defer) Character tags with mis-spelled characters

/* REGEX PATTERNS */

const tagDelimiterWithPeriod = />>\s*(\w+):?[\s]{0,3}([\w{}]*)?\.?[\s]{0,3}(\w*)?/giu
const characterNamePattern = /^([A-Z]){3,}/u
const extractNameFromValidLine = /^[+*\s-]*[({]?[\w\s]*[()]*[)}]?[*\s-]*([A-Z]{3,}):/u
const checkForCommentedLine = /^\s*\/\//
const checkForInlineLogic = /^[+*\s-]*\{[A-Z()]{3,}:(.*?)\}/iu

// Ignores spaces, dashes, stars and ink tags preceding name.


/* LINTING REQUIREMENTS PER TAG CATEGORY*/

let charTagsParam = {
  tags: ['react', 'emote', 'skin', 'hud', 'intensity', 'pose', 'anim'],
  linter: hasCharacterTagError,
  needsParam: true,
  validParams: {
    intensity: ["high", "medium", 'med', "low", 'h', 'm', 'l'],
    emote: [
      'dynamic',
      'disgust',
      'anxious',
      'neutral',
      'sad',
      'happy',
      'angry',
      'chill',
      'overjoyed',
      'tired',
      'wired',
      'flirty'
    ],
    pose: [
      'ignore',
      'focus',
      'off',
    ],
    anim: [
      'off',
      'on',
      'ticket',
      'savywanted',
      'focus',
      'ignore',
      'typing'],
    react: [
      'look_up',
      'look_down',
      'look_right',
      'look_ahead',
      'look_left',
      // 'lookleft', // Not valid, use underscore versions above.
      // 'lookright', // Not valid, use underscore versions above.
      // 'lookDown', // Not valid, use underscore versions above.
      // 'lookdown', // Not valid, use underscore versions above.
      'laugh',
      // 'notice', // No longer valid, use look_up, look_down, etc.
      // 'notice_destination', // No longer valid, use look_up, look_down, etc.
      'frown',
      'squint',
      'look',
      'shifty',
      'smirk',
      'surprise',
      // 'surprised', // DO NOT ADD BACK. Use 'surprise' for this react.
      'huh',
      'wink',
      'nod',
      'awkward',
      'yawn',
      'laugh',
      'shrug',
      'nod',
      'sigh',
      'yes',
      'smile',
      'shake',
      'frown_sad',
      'eyeroll',
      'eyes_widen',
      'wow',
      'huh',
      'pretty_please',
      'shock',
    ]
  }
}

let charTagsNoParam = {
  tags: ['paxFocus', 'paxIgnore', 'paxEnter', 'paxExit', 'paxLeft', 'paxRight'],
  linter: hasCharacterTagError,
  needsParam: false,
  validParams: {}
}

let storyTags = {
  tags: ['car', 'pause', 'setRide', 'cutCamera', 'lighting', 'sfx', 'rideEnded', 'linaHands'],
  linter: hasStoryTagError,
  needsParam: true,
  validParams: {
    cutCamera: [
      'linapov',
      'linapovclose',
      'linaclose',
      'linafront',
      'linafrontclose',
      'paxleft',
      'paxright',
      'dashcam',
      'hoodcam',
      'city',
      'establishing',
      'reverseclose',
      'reversewide',
      //'savyclose', // THIS IS INVALID, use savycloseup
      'savycloseup',
      'overshoulder',
    ],
    linaHands: [
      'checkwatch',
      'lookcenter',
      'lookleft'
    ]
  }
}

// List of simple tags that are valid but don't have any params
let simpleTags = {
  tags: ['saveGame'],
  linter: (matchObject) => {return false; },  // pass through since there's no other processing
  needsParam: false,
  validParams: {}
}

let tagsWithoutEvents = {
  linter: hasUITagError,
  needsParam: true,
  tags:
    ["id",
     "stars",
     "Title",
     'Subheader',
     'cost',
     "DisplayName",
     "Reviewers",
     "Length",
     "Bio",
     "Role",
     "Tone",
     "Difficulty",
     "FactRequirements",
     "Risk",
     "WC",
     "Version",
     "Themes",
     "Chapter",
     "Rating",
     "RatingCount",
     "AppearanceDescription",
     "Twitter",
     "AvatarDescription",
     "Author",
     "Draft",
     "Notes",
     "PickupLocation",
     "PickupNeighborhood",
     "DropoffLocation",
     "DropoffNeighborhood",
     "disabled",
     "tester",
     "fuelPreview",
     "distance"
  ],
  validParams: {}
};

let uiTags = {
  linter: hasUITagError,
  needsParam: true,
  tags:
    ["UIView",
     "UILabel",
     "UIButton",
     "UIImage",
     "UIFloat",
     "UIMovie"],
  validParams: {}
};

let uiTagsNoParams = {
    linter: hasUITagError,
    needsParam: false,
    tags:
      ["UIModal"],
    validParams: {}
};

let testerTags = {
    linter: hasTesterTagError,
    needsParam: true,
    tags:   ['tester'],
    validParams: {
        tester: ['always', 'never', 'avoid', 'prefer']
    }
};

// build a single object with all tags and their parameter values

let tagsAndLinting = {};

for (tagType of [charTagsParam, uiTags, uiTagsNoParams,tagsWithoutEvents, charTagsNoParam, storyTags, simpleTags, testerTags]) {
  for (tag of tagType.tags) {
    tagsAndLinting[tag] = {
      linter: tagType.linter,
      needsParam: tagType.needsParam,
      validParams: tagType.validParams[tag] || null
    }
  }
}

var errorType = "foo"; // Used for unit test to make sure the correct log is shown

/* LINTING FUNCTIONS FOR VARIOUS TAG CATEGORIES */

function hasCharacterTagError(matchObject) {
  let decoratedMatchObject = decorateCharTags(matchObject);

  // run basic character tag linting
  if (checkForInValidCharacterTagForm(decoratedMatchObject)) return true;

  // check for parameters, if needed
  let needsParams = tagsAndLinting[matchObject.tagName] && tagsAndLinting[matchObject.tagName].needsParam === true;

  if (needsParams && !decoratedMatchObject.parameter) {
    logBadTag(`Character tag ${matchObject.tagName} requires params, but none found`, matchObject);
    return true;
  }

  // if there is a list of param validation, make sure the parameter is in the list
  if (hasInvalidParam(matchObject, decoratedMatchObject.parameter)) return true;

  return false;
}

// Linting to confirm character tags have a name and  valid type

function checkForInValidCharacterTagForm(decoratedMatchObject) {
  if (!decoratedMatchObject.character || !decoratedMatchObject.type) {
    logBadTag(`Character tag missing or malformed: ${decoratedMatchObject.fullTag}`, decoratedMatchObject);
    return true;
  }

  if(!decoratedMatchObject.type) {
    logBadTag('Character type (inline or leadingName) could not be determined', decoratedMatchObject);
    return true;
  }

  return false;
}


function isValidPauseTag(matchObject) {
  let isInteger = string => typeof(parseInt(string)) === 'number';

  if (matchObject.tagName === 'pause' && isInteger(matchObject.semiColonArg) && (!matchObject.periodArg || isInteger(matchObject.periodArg))) {
    return true;
  }

  return false;
}


// Function that identifies the character name and parameters
// for both of the two distint character types (inline and leading)
function decorateCharTags(matchObject) {
  // TYPE: inline
  // Valid inline character tags should have a name for the semicolon arg. examples:
    // >>paxEnter:FIONA
    // >>emote:FIONA.happy
    // >> paxEnter:{paxFirstName}
  // TYPE: leadingName
    // Otherwise, the name must be the first word of the line. Examples:
    // FIONA: Hey there! >>emote:happy
    // FIONA: >>paxEnter

  if (characterNamePattern.test(matchObject.semiColonArg)) {
    matchObject.type = 'inline';
    matchObject.character = matchObject.semiColonArg;
    matchObject.parameter = matchObject.periodArg;
    return matchObject;
  }

  let charMatch = matchObject.line.match(extractNameFromValidLine);

  if (charMatch) {
    matchObject.type = 'leadingName';
    matchObject.character = charMatch[1]; // First group returned will be the name
    matchObject.parameter = matchObject.semiColonArg;
    return matchObject
  }

  // Otherwise, we have an issue
  matchObject.type = undefined;
  matchObject.character = undefined;
  return matchObject;
}

function hasStoryTagError(matchObject) {
  // story tags must have an argument after the semiColon
  if (!matchObject.semiColonArg) {
    logBadTag(`Story tag '${matchObject.fullTag}' missing argument`, matchObject);
    return true;
  }

  //some story tags have validation on their argument
  if (hasInvalidParam(matchObject, matchObject.semiColonArg)) return true;


  //story tags must have no argument after the period
  //unless it's a valid decimal-containing pause story tag
  if (matchObject.periodArg && !isValidPauseTag(matchObject)) {

    logBadTag(`Story tag '${matchObject.fullTag}' malformed: ${matchObject.fullTag}`, matchObject);
    return true;
  }

  return false;
}

function hasUITagError(matchObject) {
  if (matchObject.periodArg && !matchObject.semiColonArg) {
    logBadTag(`Malformed '${matchObject.tagName}': Flipped '.' and ':'`, matchObject);
    return true;
  } else if (matchObject.needsParam && !matchObject.semiColonArg) {
    logBadTag(`UI tag '${matchObject.fullTag}' missing argument`, matchObject);
    return true;
  }

  return false;
}

function hasTesterTagError(matchObject) {
  // tester tags must have an argument
  if (!matchObject.semiColonArg) {
    logBadTag(`Story tag '${matchObject.fullTag}' missing argument`, matchObject);
    return true;
  }

  if (hasInvalidParam(matchObject, matchObject.semiColonArg)) return true;
  return false;
}

function hasInvalidParam(matchObject, param) {
  let validParams = tagsAndLinting[matchObject.tagName] && tagsAndLinting[matchObject.tagName].validParams;
  if (validParams && !validParams.includes(param.toLowerCase())) {
    logBadTag(`Parameter for '${matchObject.tagName}' is not allowed: ${matchObject.fullTag}`, matchObject);
    return true;
  }
  return false;
}


function isCommented(line) {
  return RegExp(checkForCommentedLine).test(line);
}

/* FILE THAT RUNS LINES AND FILES THROUGH LINTING*/

function logBadTag(message, matchObject) {
  let errorDetails = `${message}\n` + colors.yellow(matchObject.line);
  if (sendOutputToStream) {
    collectedOutput += `WARNING: '${matchObject.path}' line ${matchObject.lineIndex}: ${message}\n`;
  } else {
    console.log(`WARNING: '${matchObject.path}' line ${matchObject.lineIndex}: ${errorDetails}`);
  }
}

function lintInkFile(path) {
  let text = fs.readFile(path, 'utf8', function(err, data) {
    lintBuffer(path, data);
  });
}

function lintBuffer(path, data) {
    let lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
      hasLineErrors(lines[i], i + 1, path);
    }
}

function lintFilesFromInky(inkFileBuffers) {
    sendOutputToStream = true;
    collectedOutput = "";

    for (var path in inkFileBuffers) {
        console.log(`Linting ${path}`);
        lintBuffer(path, inkFileBuffers[path]);
    }

    return collectedOutput;
}

function hasLineErrors(line, lineNumber, path) {
  let lineError = false;

  if (isCommented(line)) {
    return false;
  }

  // Strip out inline logic, e.g.  {Cute:LINA: Oh yeah, I was destined for greatness 'til the RSI. >>react:wink} --> LINA: Oh yeah, I was destined for greatness 'til the RSI. >>react:wink
  let lineWithInlineLogic = checkForInlineLogic.exec(line);
  if (lineWithInlineLogic) {
      line = lineWithInlineLogic[1];
  }

  do {
    match = tagDelimiterWithPeriod.exec(line);

    if (match) {
      let matchObject = {
        fullTag: match[0],
        tagName: match[1],
        semiColonArg: match[2],
        periodArg: match[3],
        lineIndex: lineNumber,
        path: path,
        line: line
      };
    //  console.log(matchObject)
      if (tagsAndLinting[matchObject.tagName]) {
        let lintingErrorFunction = tagsAndLinting[matchObject.tagName].linter;

        if (lintingErrorFunction(matchObject)) lineError = true;

      } else {
        // Check for case errors
        let closeMatch = Object.keys(tagsAndLinting).find((key) => key.toLowerCase() == matchObject.tagName.toLowerCase());
        let closeMatchPrompt = closeMatch ? `. Did you mean '>>${closeMatch}'?` : "";
        logBadTag(`Unknown tag: '>>${matchObject.tagName}'${closeMatchPrompt}`, matchObject);
        lineError = true;
      }
    }
  } while (match);

  return lineError;
}

glob(filesToLint, function( err, files ) {
  if( err ) {
      console.error( "Could not list the directory.", err );
      process.exit( 1 );
  }

  files.forEach(lintInkFile);
  console.log('File to review:', files.length);
});

module.exports = hasLineErrors;
module.exports.lintFilesFromInky = lintFilesFromInky;
module.exports.errorType = errorType;
