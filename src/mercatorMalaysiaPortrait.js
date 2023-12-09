import { epsilon } from "./math.js";
import { geoMercator as mercator } from "d3-geo";
import { fitExtent, fitSize } from "./fit.js";
import { path } from "d3-path";

// The projections must have mutually exclusive clip regions on the sphere,
// as this will avoid emitting interleaving lines and polygons.
function multiplex(streams) {
  var n = streams.length;
  return {
    point: function (x, y) {
      var i = -1;
      while (++i < n) {
        streams[i].point(x, y);
      }
    },
    sphere: function () {
      var i = -1;
      while (++i < n) {
        streams[i].sphere();
      }
    },
    lineStart: function () {
      var i = -1;
      while (++i < n) {
        streams[i].lineStart();
      }
    },
    lineEnd: function () {
      var i = -1;
      while (++i < n) {
        streams[i].lineEnd();
      }
    },
    polygonStart: function () {
      var i = -1;
      while (++i < n) {
        streams[i].polygonStart();
      }
    },
    polygonEnd: function () {
      var i = -1;
      while (++i < n) {
        streams[i].polygonEnd();
      }
    },
  };
}

// A composite projection for Malaysia, configured by default for 960×500.
export default function () {
  var cache,
    cacheStream,
    peninsular = mercator().center([105.25, 4.0]),
    peninsularPoint,
    borneo = mercator().center([118.65, 2.86]),
    borneoPoint,
    point,
    pointStream = {
      point: function (x, y) {
        point = [x, y];
      },
    };

  function portraitMalaysia(coordinates) {
    var x = coordinates[0],
      y = coordinates[1];
    return (
      (point = null),
      (peninsularPoint.point(x, y), point) || (borneoPoint.point(x, y), point)
    );
  }

  portraitMalaysia.invert = function (coordinates) {
    var k = peninsular.scale(),
      t = peninsular.translate(),
      x = (coordinates[0] - t[0]) / k,
      y = (coordinates[1] - t[1]) / k;

    return (
      y >= -0.0521 && y < 0.0229 && x >= -0.0111 && x < 0.1
        ? borneo
        : peninsular
    ).invert(coordinates);
  };

  portraitMalaysia.stream = function (stream) {
    return cache && cacheStream === stream
      ? cache
      : (cache = multiplex([
          peninsular.stream((cacheStream = stream)),
          borneo.stream(stream),
        ]));
  };

  portraitMalaysia.precision = function (_) {
    if (!arguments.length) {
      return peninsular.precision();
    }
    peninsular.precision(_);
    borneo.precision(_);
    return reset();
  };

  portraitMalaysia.scale = function (_) {
    if (!arguments.length) {
      return peninsular.scale();
    }
    peninsular.scale(_);
    borneo.scale(_ * 0.8);
    return portraitMalaysia.translate(peninsular.translate());
  };

  portraitMalaysia.translate = function (_) {
    if (!arguments.length) {
      return peninsular.translate();
    }
    var k = peninsular.scale(),
      x = +_[0],
      y = +_[1];

    peninsularPoint = peninsular
      .translate([_[0] - 0.02 * k, _[1]])
      .clipExtent([
        [x - 0.11 * k, y - 0.0521 * k],
        [x - 0.0111 * k, y + 0.0521 * k],
      ])
      .stream(pointStream);

    borneoPoint = borneo
      .translate([x + 0.053 * k, y + 0.1 * k])
      .clipExtent([
        [x - 0.11 * k + epsilon, y - 0.0521 * k + epsilon],
        [x + 0.2 * k - epsilon, y + 2.1 * k - epsilon],
      ])
      .stream(pointStream);

    return reset();
  };

  portraitMalaysia.fitExtent = function (extent, object) {
    return fitExtent(portraitMalaysia, extent, object);
  };

  portraitMalaysia.fitSize = function (size, object) {
    return fitSize(portraitMalaysia, size, object);
  };

  function reset() {
    cache = cacheStream = null;
    return portraitMalaysia;
  }

  portraitMalaysia.drawCompositionBorders = function (context) {
    var llbor = peninsular([102.5, -0.75]);
    var lmbor = peninsular([106, 0.55]);
    var end = peninsular([108, 5]);

    context.moveTo(llbor[0], llbor[1]);
    context.lineTo(lmbor[0], lmbor[1]);
    context.lineTo(end[0], end[1]);
  };
  portraitMalaysia.getCompositionBorders = function () {
    var context = path();
    this.drawCompositionBorders(context);
    return context.toString();
  };

  return portraitMalaysia.scale(4000);
}
