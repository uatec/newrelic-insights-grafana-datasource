import {QueryCtrl} from 'app/plugins/sdk';
import _ from 'lodash';

export default class NewRelicQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  /** @ngInject **/
  constructor($scope, $injector) {
    super($scope, $injector);
  };
}